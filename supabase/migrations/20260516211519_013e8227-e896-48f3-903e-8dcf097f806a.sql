
-- ============================================================
-- Khalil P2.6 — Coach proposal/dispose architecture
-- ============================================================

CREATE TABLE IF NOT EXISTS public.khalil_coach_proposal (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN (
    'gentle-reminder',
    'recovery-suggestion',
    'pillar-rebalance-hint',
    'consistency-guidance',
    'quiet-day'
  )),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'accepted', 'dismissed', 'expired'
  )),
  copy_key text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  suggested_capability text NULL,
  prompt_version text NOT NULL DEFAULT 'v1',
  client_event_id text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz NULL,
  dismissed_at timestamptz NULL
);

CREATE INDEX IF NOT EXISTS khalil_coach_proposal_user_status_idx
  ON public.khalil_coach_proposal (user_id, status, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS khalil_coach_proposal_client_event_unique
  ON public.khalil_coach_proposal (user_id, client_event_id)
  WHERE client_event_id IS NOT NULL;

ALTER TABLE public.khalil_coach_proposal ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coach_proposal_select_own"
  ON public.khalil_coach_proposal FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "coach_proposal_insert_own"
  ON public.khalil_coach_proposal FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- UPDATE allowed only to transition lifecycle (guard trigger enforces shape).
CREATE POLICY "coach_proposal_update_own"
  ON public.khalil_coach_proposal FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- No DELETE policy = no delete allowed.

-- ============================================================
-- Append-only lifecycle guard
-- ============================================================
CREATE OR REPLACE FUNCTION public.khalil_coach_proposal_lifecycle_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Immutable fields
  IF NEW.id <> OLD.id
     OR NEW.user_id <> OLD.user_id
     OR NEW.kind <> OLD.kind
     OR NEW.copy_key <> OLD.copy_key
     OR NEW.payload::text <> OLD.payload::text
     OR COALESCE(NEW.suggested_capability,'') <> COALESCE(OLD.suggested_capability,'')
     OR NEW.created_at <> OLD.created_at
     OR NEW.expires_at <> OLD.expires_at
     OR NEW.prompt_version <> OLD.prompt_version
     OR COALESCE(NEW.client_event_id,'') <> COALESCE(OLD.client_event_id,'')
  THEN
    RAISE EXCEPTION 'khalil_coach_proposal is append-only — immutable field changed';
  END IF;

  -- Only legal status transitions: pending -> {accepted, dismissed, expired}
  IF OLD.status <> 'pending' AND NEW.status <> OLD.status THEN
    RAISE EXCEPTION 'khalil_coach_proposal status is terminal: %', OLD.status;
  END IF;

  IF NEW.status NOT IN ('pending','accepted','dismissed','expired') THEN
    RAISE EXCEPTION 'khalil_coach_proposal invalid status: %', NEW.status;
  END IF;

  -- Stamp lifecycle timestamps
  IF NEW.status = 'accepted' AND NEW.accepted_at IS NULL THEN
    NEW.accepted_at := now();
  END IF;
  IF NEW.status = 'dismissed' AND NEW.dismissed_at IS NULL THEN
    NEW.dismissed_at := now();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS khalil_coach_proposal_lifecycle_guard
  ON public.khalil_coach_proposal;
CREATE TRIGGER khalil_coach_proposal_lifecycle_guard
  BEFORE UPDATE ON public.khalil_coach_proposal
  FOR EACH ROW
  EXECUTE FUNCTION public.khalil_coach_proposal_lifecycle_guard();

-- Block hard deletes belt-and-suspenders
CREATE OR REPLACE FUNCTION public.khalil_coach_proposal_no_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'khalil_coach_proposal does not allow DELETE';
END;
$$;

DROP TRIGGER IF EXISTS khalil_coach_proposal_no_delete
  ON public.khalil_coach_proposal;
CREATE TRIGGER khalil_coach_proposal_no_delete
  BEFORE DELETE ON public.khalil_coach_proposal
  FOR EACH ROW
  EXECUTE FUNCTION public.khalil_coach_proposal_no_delete();

-- ============================================================
-- Audit table (append-only)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.khalil_coach_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL REFERENCES public.khalil_coach_proposal(id),
  user_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('proposed','accepted','dismissed','expired','rejected')),
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS khalil_coach_audit_user_idx
  ON public.khalil_coach_audit (user_id, created_at DESC);

ALTER TABLE public.khalil_coach_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coach_audit_select_own"
  ON public.khalil_coach_audit FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "coach_audit_insert_own"
  ON public.khalil_coach_audit FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.khalil_coach_audit_immutable()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'khalil_coach_audit is append-only';
END;
$$;

DROP TRIGGER IF EXISTS khalil_coach_audit_no_update ON public.khalil_coach_audit;
CREATE TRIGGER khalil_coach_audit_no_update
  BEFORE UPDATE ON public.khalil_coach_audit
  FOR EACH ROW
  EXECUTE FUNCTION public.khalil_coach_audit_immutable();

DROP TRIGGER IF EXISTS khalil_coach_audit_no_delete ON public.khalil_coach_audit;
CREATE TRIGGER khalil_coach_audit_no_delete
  BEFORE DELETE ON public.khalil_coach_audit
  FOR EACH ROW
  EXECUTE FUNCTION public.khalil_coach_audit_immutable();
