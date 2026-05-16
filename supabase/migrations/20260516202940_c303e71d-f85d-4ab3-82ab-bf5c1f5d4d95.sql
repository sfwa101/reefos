
-- Khalil Habit Pillar — P2.3 foundation

-- 1) Cadence enum -----------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.khalil_habit_cadence AS ENUM ('daily','weekdays','custom');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2) Habit definitions (sovereign, archive-only mutation) ------------------
CREATE TABLE IF NOT EXISTS public.khalil_habit_definition (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  slug text NOT NULL,
  name_key text NOT NULL,
  cadence public.khalil_habit_cadence NOT NULL DEFAULT 'daily',
  target_per_day int NOT NULL DEFAULT 1 CHECK (target_per_day BETWEEN 1 AND 20),
  created_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz NULL,
  CONSTRAINT khalil_habit_definition_slug_unique UNIQUE (user_id, slug),
  CONSTRAINT khalil_habit_definition_slug_format
    CHECK (slug ~ '^[a-z0-9][a-z0-9_-]{1,48}$')
);

CREATE INDEX IF NOT EXISTS khalil_habit_definition_user_active_idx
  ON public.khalil_habit_definition (user_id) WHERE archived_at IS NULL;

ALTER TABLE public.khalil_habit_definition ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "khalil_habit_definition_select_own" ON public.khalil_habit_definition;
CREATE POLICY "khalil_habit_definition_select_own"
  ON public.khalil_habit_definition FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "khalil_habit_definition_insert_own" ON public.khalil_habit_definition;
CREATE POLICY "khalil_habit_definition_insert_own"
  ON public.khalil_habit_definition FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "khalil_habit_definition_update_own" ON public.khalil_habit_definition;
CREATE POLICY "khalil_habit_definition_update_own"
  ON public.khalil_habit_definition FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Trigger-level guard: only archived_at may be mutated; no hard delete.
CREATE OR REPLACE FUNCTION public.khalil_habit_definition_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'khalil_habit_definition: hard delete forbidden (Art. IV). Archive instead.';
  END IF;
  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.slug IS DISTINCT FROM OLD.slug
     OR NEW.name_key IS DISTINCT FROM OLD.name_key
     OR NEW.cadence IS DISTINCT FROM OLD.cadence
     OR NEW.target_per_day IS DISTINCT FROM OLD.target_per_day
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'khalil_habit_definition: only archived_at may change.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS khalil_habit_definition_no_delete ON public.khalil_habit_definition;
CREATE TRIGGER khalil_habit_definition_no_delete
  BEFORE DELETE ON public.khalil_habit_definition
  FOR EACH ROW EXECUTE FUNCTION public.khalil_habit_definition_guard();

DROP TRIGGER IF EXISTS khalil_habit_definition_archive_only ON public.khalil_habit_definition;
CREATE TRIGGER khalil_habit_definition_archive_only
  BEFORE UPDATE ON public.khalil_habit_definition
  FOR EACH ROW EXECUTE FUNCTION public.khalil_habit_definition_guard();

-- 3) Habit completion (append-only) ----------------------------------------
DO $$ BEGIN
  CREATE TYPE public.khalil_habit_completion_mode AS ENUM ('normal','recovery_yesterday','manual_backfill');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.khalil_habit_completion (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  habit_id uuid NOT NULL REFERENCES public.khalil_habit_definition(id) ON DELETE RESTRICT,
  date date NOT NULL,
  partial numeric(3,2) NOT NULL DEFAULT 1.0 CHECK (partial > 0 AND partial <= 1),
  mode public.khalil_habit_completion_mode NOT NULL DEFAULT 'normal',
  created_at timestamptz NOT NULL DEFAULT now(),
  client_event_id text NOT NULL,
  CONSTRAINT khalil_habit_completion_dedupe UNIQUE (user_id, habit_id, date),
  CONSTRAINT khalil_habit_completion_client_event_unique UNIQUE (client_event_id)
);

CREATE INDEX IF NOT EXISTS khalil_habit_completion_user_date_idx
  ON public.khalil_habit_completion (user_id, date);

ALTER TABLE public.khalil_habit_completion ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "khalil_habit_completion_select_own" ON public.khalil_habit_completion;
CREATE POLICY "khalil_habit_completion_select_own"
  ON public.khalil_habit_completion FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "khalil_habit_completion_insert_own" ON public.khalil_habit_completion;
CREATE POLICY "khalil_habit_completion_insert_own"
  ON public.khalil_habit_completion FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- No UPDATE / DELETE policy. Belt-and-braces immutability trigger:
CREATE OR REPLACE FUNCTION public.khalil_habit_completion_immutable()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RAISE EXCEPTION 'khalil_habit_completion is append-only (Art. IV)';
END;
$$;

DROP TRIGGER IF EXISTS khalil_habit_completion_no_update ON public.khalil_habit_completion;
CREATE TRIGGER khalil_habit_completion_no_update
  BEFORE UPDATE ON public.khalil_habit_completion
  FOR EACH ROW EXECUTE FUNCTION public.khalil_habit_completion_immutable();

DROP TRIGGER IF EXISTS khalil_habit_completion_no_delete ON public.khalil_habit_completion;
CREATE TRIGGER khalil_habit_completion_no_delete
  BEFORE DELETE ON public.khalil_habit_completion
  FOR EACH ROW EXECUTE FUNCTION public.khalil_habit_completion_immutable();

-- 4) Extend adherence projection with scores -------------------------------
ALTER TABLE public.khalil_adherence_daily
  ADD COLUMN IF NOT EXISTS prayer_score numeric(4,3) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS habit_score numeric(4,3) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS combined_score numeric(4,3) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS habit_completed_count smallint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS habit_target_count smallint NOT NULL DEFAULT 0;

-- 5) Recompute (idempotent, full-recompute from logs) ----------------------
CREATE OR REPLACE FUNCTION public.khalil_recompute_adherence(
  p_user_id uuid,
  p_date date
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_on_time_prayers public.khalil_prayer_name[];
  v_qadaa_prayers public.khalil_prayer_name[];
  v_on_time_n smallint;
  v_qadaa_n smallint;
  v_habit_target numeric;
  v_habit_done numeric;
  v_prayer_score numeric(4,3);
  v_habit_score numeric(4,3);
  v_combined numeric(4,3);
BEGIN
  -- Prayers
  SELECT COALESCE(array_agg(DISTINCT prayer ORDER BY prayer)
                  FILTER (WHERE mode = 'on_time'), '{}'),
         COALESCE(array_agg(DISTINCT prayer ORDER BY prayer)
                  FILTER (WHERE mode = 'qadaa'), '{}')
    INTO v_on_time_prayers, v_qadaa_prayers
  FROM public.khalil_prayer_log
  WHERE user_id = p_user_id AND logged_for_date = p_date;

  v_on_time_n := COALESCE(array_length(v_on_time_prayers, 1), 0);
  v_qadaa_n   := COALESCE(array_length(v_qadaa_prayers, 1), 0);
  -- on-time gets full credit; qadaa half credit; cap at 5 prayers/day
  v_prayer_score := LEAST(1.0, (v_on_time_n + (v_qadaa_n * 0.5)) / 5.0);

  -- Habits: active definitions on the day
  SELECT COALESCE(SUM(target_per_day), 0)
    INTO v_habit_target
  FROM public.khalil_habit_definition
  WHERE user_id = p_user_id
    AND created_at::date <= p_date
    AND (archived_at IS NULL OR archived_at::date > p_date);

  SELECT COALESCE(SUM(LEAST(partial, 1.0)), 0)
    INTO v_habit_done
  FROM public.khalil_habit_completion c
  JOIN public.khalil_habit_definition d ON d.id = c.habit_id
  WHERE c.user_id = p_user_id AND c.date = p_date;

  IF v_habit_target = 0 THEN
    v_habit_score := 0;
  ELSE
    v_habit_score := LEAST(1.0, (v_habit_done / v_habit_target))::numeric(4,3);
  END IF;

  -- Combined: average of pillars that have content; else prayer alone.
  IF v_habit_target = 0 THEN
    v_combined := v_prayer_score;
  ELSE
    v_combined := ((v_prayer_score + v_habit_score) / 2.0)::numeric(4,3);
  END IF;

  INSERT INTO public.khalil_adherence_daily AS d (
    user_id, for_date,
    on_time_count, qadaa_count, total_count,
    on_time_prayers, qadaa_prayers,
    habit_completed_count, habit_target_count,
    prayer_score, habit_score, combined_score,
    updated_at
  )
  VALUES (
    p_user_id, p_date,
    v_on_time_n, v_qadaa_n, v_on_time_n + v_qadaa_n,
    v_on_time_prayers, v_qadaa_prayers,
    LEAST(v_habit_done, 32767)::smallint,
    LEAST(v_habit_target, 32767)::smallint,
    v_prayer_score, v_habit_score, v_combined,
    now()
  )
  ON CONFLICT (user_id, for_date) DO UPDATE
    SET on_time_count = EXCLUDED.on_time_count,
        qadaa_count = EXCLUDED.qadaa_count,
        total_count = EXCLUDED.total_count,
        on_time_prayers = EXCLUDED.on_time_prayers,
        qadaa_prayers = EXCLUDED.qadaa_prayers,
        habit_completed_count = EXCLUDED.habit_completed_count,
        habit_target_count = EXCLUDED.habit_target_count,
        prayer_score = EXCLUDED.prayer_score,
        habit_score = EXCLUDED.habit_score,
        combined_score = EXCLUDED.combined_score,
        updated_at = now();
END;
$$;

-- 6) Habit completion subscriber -------------------------------------------
CREATE OR REPLACE FUNCTION public.khalil_habit_completion_after_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.khalil_recompute_adherence(NEW.user_id, NEW.date);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS khalil_habit_completion_project ON public.khalil_habit_completion;
CREATE TRIGGER khalil_habit_completion_project
  AFTER INSERT ON public.khalil_habit_completion
  FOR EACH ROW EXECUTE FUNCTION public.khalil_habit_completion_after_insert();
