-- Khalil Recovery Pillar — P2.4 foundation

-- 1) Enum --------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.khalil_recovery_mode AS ENUM ('off','soft','hard');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2) Append-only recovery event log -----------------------------------------
CREATE TABLE IF NOT EXISTS public.khalil_recovery_event (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  from_state public.khalil_recovery_mode NOT NULL,
  to_state public.khalil_recovery_mode NOT NULL,
  reason text NULL,
  client_event_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT khalil_recovery_event_client_event_unique
    UNIQUE (client_event_id),
  CONSTRAINT khalil_recovery_event_distinct_states
    CHECK (from_state <> to_state)
);

CREATE INDEX IF NOT EXISTS khalil_recovery_event_user_created_idx
  ON public.khalil_recovery_event (user_id, created_at DESC);

ALTER TABLE public.khalil_recovery_event ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "khalil_recovery_event_select_own"
  ON public.khalil_recovery_event;
CREATE POLICY "khalil_recovery_event_select_own"
  ON public.khalil_recovery_event
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "khalil_recovery_event_insert_own"
  ON public.khalil_recovery_event;
CREATE POLICY "khalil_recovery_event_insert_own"
  ON public.khalil_recovery_event
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Append-only enforcement (belt-and-braces against service_role).
CREATE OR REPLACE FUNCTION public.khalil_recovery_event_immutable()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'khalil_recovery_event is append-only (Art. IV)';
END;
$$;

DROP TRIGGER IF EXISTS khalil_recovery_event_no_update ON public.khalil_recovery_event;
CREATE TRIGGER khalil_recovery_event_no_update
  BEFORE UPDATE ON public.khalil_recovery_event
  FOR EACH ROW EXECUTE FUNCTION public.khalil_recovery_event_immutable();

DROP TRIGGER IF EXISTS khalil_recovery_event_no_delete ON public.khalil_recovery_event;
CREATE TRIGGER khalil_recovery_event_no_delete
  BEFORE DELETE ON public.khalil_recovery_event
  FOR EACH ROW EXECUTE FUNCTION public.khalil_recovery_event_immutable();

-- 3) Recovery state projection ----------------------------------------------
CREATE TABLE IF NOT EXISTS public.khalil_recovery_state (
  user_id uuid PRIMARY KEY,
  current_state public.khalil_recovery_mode NOT NULL DEFAULT 'off',
  entered_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.khalil_recovery_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "khalil_recovery_state_select_own"
  ON public.khalil_recovery_state;
CREATE POLICY "khalil_recovery_state_select_own"
  ON public.khalil_recovery_state
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- No write policies → only service_role / SECURITY DEFINER trigger may mutate.

-- 4) Projection maintainer --------------------------------------------------
CREATE OR REPLACE FUNCTION public.khalil_recompute_recovery_state(
  p_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_last_state public.khalil_recovery_mode;
  v_entered_at timestamptz;
BEGIN
  SELECT to_state, created_at
    INTO v_last_state, v_entered_at
  FROM public.khalil_recovery_event
  WHERE user_id = p_user_id
  ORDER BY created_at DESC, id DESC
  LIMIT 1;

  IF v_last_state IS NULL THEN
    v_last_state := 'off';
    v_entered_at := now();
  END IF;

  INSERT INTO public.khalil_recovery_state AS s (
    user_id, current_state, entered_at, updated_at
  ) VALUES (
    p_user_id, v_last_state, v_entered_at, now()
  )
  ON CONFLICT (user_id) DO UPDATE
    SET current_state = EXCLUDED.current_state,
        entered_at    = EXCLUDED.entered_at,
        updated_at    = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.khalil_recovery_event_after_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.khalil_recompute_recovery_state(NEW.user_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS khalil_recovery_event_project ON public.khalil_recovery_event;
CREATE TRIGGER khalil_recovery_event_project
  AFTER INSERT ON public.khalil_recovery_event
  FOR EACH ROW EXECUTE FUNCTION public.khalil_recovery_event_after_insert();

-- 5) Adherence projection — recovery softening extension --------------------
ALTER TABLE public.khalil_adherence_daily
  ADD COLUMN IF NOT EXISTS recovery_modifier public.khalil_recovery_mode NOT NULL DEFAULT 'off';

ALTER TABLE public.khalil_adherence_daily
  ADD COLUMN IF NOT EXISTS recovery_days_count smallint NOT NULL DEFAULT 0;