-- Khalil Prayer Pillar — P2.2 foundation

-- 1) Enums ------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.khalil_prayer_name AS ENUM
    ('fajr','dhuhr','asr','maghrib','isha');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.khalil_prayer_mode AS ENUM ('on_time','qadaa');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2) Append-only prayer log -------------------------------------------------
CREATE TABLE IF NOT EXISTS public.khalil_prayer_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  prayer public.khalil_prayer_name NOT NULL,
  mode public.khalil_prayer_mode NOT NULL,
  logged_for_date date NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  client_event_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT khalil_prayer_log_dedupe
    UNIQUE (user_id, logged_for_date, prayer, mode),
  CONSTRAINT khalil_prayer_log_client_event_unique
    UNIQUE (client_event_id)
);

CREATE INDEX IF NOT EXISTS khalil_prayer_log_user_date_idx
  ON public.khalil_prayer_log (user_id, logged_for_date);
CREATE INDEX IF NOT EXISTS khalil_prayer_log_user_occurred_idx
  ON public.khalil_prayer_log (user_id, occurred_at DESC);

ALTER TABLE public.khalil_prayer_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "khalil_prayer_log_select_own"
  ON public.khalil_prayer_log;
CREATE POLICY "khalil_prayer_log_select_own"
  ON public.khalil_prayer_log
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "khalil_prayer_log_insert_own"
  ON public.khalil_prayer_log;
CREATE POLICY "khalil_prayer_log_insert_own"
  ON public.khalil_prayer_log
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- No UPDATE / DELETE policy → operations are denied by default under RLS.
-- Belt-and-braces: trigger-level immutability so even service_role cannot
-- silently mutate history. Corrections must be new rows (compensating events).
CREATE OR REPLACE FUNCTION public.khalil_prayer_log_immutable()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'khalil_prayer_log is append-only (Art. IV)';
END;
$$;

DROP TRIGGER IF EXISTS khalil_prayer_log_no_update ON public.khalil_prayer_log;
CREATE TRIGGER khalil_prayer_log_no_update
  BEFORE UPDATE ON public.khalil_prayer_log
  FOR EACH ROW EXECUTE FUNCTION public.khalil_prayer_log_immutable();

DROP TRIGGER IF EXISTS khalil_prayer_log_no_delete ON public.khalil_prayer_log;
CREATE TRIGGER khalil_prayer_log_no_delete
  BEFORE DELETE ON public.khalil_prayer_log
  FOR EACH ROW EXECUTE FUNCTION public.khalil_prayer_log_immutable();

-- 3) Daily adherence projection --------------------------------------------
-- System-maintained read-model rebuildable from khalil_prayer_log.
CREATE TABLE IF NOT EXISTS public.khalil_adherence_daily (
  user_id uuid NOT NULL,
  for_date date NOT NULL,
  on_time_count smallint NOT NULL DEFAULT 0,
  qadaa_count smallint NOT NULL DEFAULT 0,
  total_count smallint NOT NULL DEFAULT 0,
  on_time_prayers public.khalil_prayer_name[] NOT NULL DEFAULT '{}',
  qadaa_prayers public.khalil_prayer_name[] NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, for_date)
);

CREATE INDEX IF NOT EXISTS khalil_adherence_daily_user_idx
  ON public.khalil_adherence_daily (user_id, for_date DESC);

ALTER TABLE public.khalil_adherence_daily ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "khalil_adherence_daily_select_own"
  ON public.khalil_adherence_daily;
CREATE POLICY "khalil_adherence_daily_select_own"
  ON public.khalil_adherence_daily
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- No write policies → only service_role (subscriber/replay job) may mutate.

-- 4) Projection maintainer -------------------------------------------------
-- Pure SQL projection: idempotent recompute of one (user, day) row from log.
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
BEGIN
  SELECT COALESCE(array_agg(DISTINCT prayer ORDER BY prayer)
                  FILTER (WHERE mode = 'on_time'), '{}'),
         COALESCE(array_agg(DISTINCT prayer ORDER BY prayer)
                  FILTER (WHERE mode = 'qadaa'), '{}')
    INTO v_on_time_prayers, v_qadaa_prayers
  FROM public.khalil_prayer_log
  WHERE user_id = p_user_id
    AND logged_for_date = p_date;

  INSERT INTO public.khalil_adherence_daily AS d (
    user_id, for_date,
    on_time_count, qadaa_count, total_count,
    on_time_prayers, qadaa_prayers, updated_at
  )
  VALUES (
    p_user_id, p_date,
    array_length(v_on_time_prayers, 1),
    array_length(v_qadaa_prayers, 1),
    COALESCE(array_length(v_on_time_prayers, 1), 0)
      + COALESCE(array_length(v_qadaa_prayers, 1), 0),
    v_on_time_prayers, v_qadaa_prayers, now()
  )
  ON CONFLICT (user_id, for_date) DO UPDATE
    SET on_time_count = COALESCE(array_length(EXCLUDED.on_time_prayers, 1), 0),
        qadaa_count = COALESCE(array_length(EXCLUDED.qadaa_prayers, 1), 0),
        total_count = COALESCE(array_length(EXCLUDED.on_time_prayers, 1), 0)
                    + COALESCE(array_length(EXCLUDED.qadaa_prayers, 1), 0),
        on_time_prayers = EXCLUDED.on_time_prayers,
        qadaa_prayers = EXCLUDED.qadaa_prayers,
        updated_at = now();
END;
$$;

-- Subscriber: after each append, refresh that day's projection. Idempotent
-- by construction (full recompute from the log).
CREATE OR REPLACE FUNCTION public.khalil_prayer_log_after_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.khalil_recompute_adherence(NEW.user_id, NEW.logged_for_date);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS khalil_prayer_log_project ON public.khalil_prayer_log;
CREATE TRIGGER khalil_prayer_log_project
  AFTER INSERT ON public.khalil_prayer_log
  FOR EACH ROW EXECUTE FUNCTION public.khalil_prayer_log_after_insert();