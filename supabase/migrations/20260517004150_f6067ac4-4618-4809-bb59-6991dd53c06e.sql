
-- P3.2 — Sovereign Missions & Adaptive Journeys
-- Append-only mission storage + lifecycle events + deterministic daily journey snapshot.

CREATE TABLE IF NOT EXISTS public.khalil_mission (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  mission_type text NOT NULL,
  title_key text NOT NULL,
  body_key text NOT NULL,
  intensity smallint NOT NULL DEFAULT 1,
  category text NOT NULL,
  status text NOT NULL DEFAULT 'proposed',
  generated_from_snapshot text NOT NULL,
  stable_key text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT khalil_mission_intensity_range CHECK (intensity BETWEEN 1 AND 5),
  CONSTRAINT khalil_mission_status_valid CHECK (
    status IN ('proposed','active','completed','expired','dismissed')
  )
);

CREATE INDEX IF NOT EXISTS idx_khalil_mission_user_status
  ON public.khalil_mission(user_id, status, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS uq_khalil_mission_stable_key
  ON public.khalil_mission(user_id, stable_key);

ALTER TABLE public.khalil_mission ENABLE ROW LEVEL SECURITY;

CREATE POLICY "khalil_mission_owner_select"
  ON public.khalil_mission FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "khalil_mission_owner_insert"
  ON public.khalil_mission FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Mission lifecycle events (immutable, append-only)
CREATE TABLE IF NOT EXISTS public.khalil_mission_event (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id uuid NOT NULL REFERENCES public.khalil_mission(id) ON DELETE RESTRICT,
  user_id uuid NOT NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  client_event_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT khalil_mission_event_type_valid CHECK (
    event_type IN ('created','accepted','completed','dismissed','expired')
  )
);

CREATE INDEX IF NOT EXISTS idx_khalil_mission_event_user
  ON public.khalil_mission_event(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_khalil_mission_event_mission
  ON public.khalil_mission_event(mission_id, created_at);

CREATE UNIQUE INDEX IF NOT EXISTS uq_khalil_mission_event_dedupe
  ON public.khalil_mission_event(user_id, mission_id, event_type, client_event_id)
  WHERE client_event_id IS NOT NULL;

ALTER TABLE public.khalil_mission_event ENABLE ROW LEVEL SECURITY;

CREATE POLICY "khalil_mission_event_owner_select"
  ON public.khalil_mission_event FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "khalil_mission_event_owner_insert"
  ON public.khalil_mission_event FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Daily journey snapshot (append-only, immutable)
CREATE TABLE IF NOT EXISTS public.khalil_daily_journey (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  local_date date NOT NULL,
  journey_payload jsonb NOT NULL,
  inputs_digest text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_khalil_daily_journey_user_date
  ON public.khalil_daily_journey(user_id, local_date DESC, created_at DESC);

ALTER TABLE public.khalil_daily_journey ENABLE ROW LEVEL SECURITY;

CREATE POLICY "khalil_daily_journey_owner_select"
  ON public.khalil_daily_journey FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "khalil_daily_journey_owner_insert"
  ON public.khalil_daily_journey FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Append-only enforcement: forbid UPDATE/DELETE on mission_event and daily_journey.
-- khalil_mission itself accepts a single in-place status transition via security-definer fn (not via direct UPDATE).
CREATE OR REPLACE FUNCTION public.khalil_missions_block_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'append-only table: % rejects %', TG_TABLE_NAME, TG_OP;
END;
$$;

DROP TRIGGER IF EXISTS khalil_mission_event_no_update ON public.khalil_mission_event;
CREATE TRIGGER khalil_mission_event_no_update
  BEFORE UPDATE OR DELETE ON public.khalil_mission_event
  FOR EACH ROW EXECUTE FUNCTION public.khalil_missions_block_mutation();

DROP TRIGGER IF EXISTS khalil_daily_journey_no_update ON public.khalil_daily_journey;
CREATE TRIGGER khalil_daily_journey_no_update
  BEFORE UPDATE OR DELETE ON public.khalil_daily_journey
  FOR EACH ROW EXECUTE FUNCTION public.khalil_missions_block_mutation();

-- khalil_mission: deletes forbidden. Status updates allowed only when transitioning
-- from a non-terminal state to a defined next state (lifecycle invariant enforced server-side too).
CREATE OR REPLACE FUNCTION public.khalil_mission_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'append-only table: khalil_mission rejects DELETE';
  END IF;
  IF TG_OP = 'UPDATE' THEN
    IF OLD.id <> NEW.id OR OLD.user_id <> NEW.user_id
       OR OLD.mission_type <> NEW.mission_type
       OR OLD.stable_key <> NEW.stable_key
       OR OLD.generated_from_snapshot <> NEW.generated_from_snapshot
       OR OLD.created_at <> NEW.created_at THEN
      RAISE EXCEPTION 'khalil_mission: identity columns are immutable';
    END IF;
    IF OLD.status IN ('completed','expired','dismissed') AND NEW.status <> OLD.status THEN
      RAISE EXCEPTION 'khalil_mission: terminal status % is immutable', OLD.status;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS khalil_mission_guard ON public.khalil_mission;
CREATE TRIGGER khalil_mission_guard
  BEFORE UPDATE OR DELETE ON public.khalil_mission
  FOR EACH ROW EXECUTE FUNCTION public.khalil_mission_guard();
