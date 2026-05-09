
-- 1. Immutable event timeline
CREATE TABLE IF NOT EXISTS public.salsabil_event_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trace_id UUID NOT NULL,
  actor_id UUID,
  event_domain TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_event_timeline_trace ON public.salsabil_event_timeline(trace_id);
CREATE INDEX IF NOT EXISTS idx_event_timeline_actor ON public.salsabil_event_timeline(actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_event_timeline_domain ON public.salsabil_event_timeline(event_domain, event_type, created_at DESC);

ALTER TABLE public.salsabil_event_timeline ENABLE ROW LEVEL SECURITY;

-- Admins can read the full timeline.
DROP POLICY IF EXISTS "event_timeline_admin_read" ON public.salsabil_event_timeline;
CREATE POLICY "event_timeline_admin_read"
  ON public.salsabil_event_timeline FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Authenticated users may append rows (actor must be themselves or null for system).
DROP POLICY IF EXISTS "event_timeline_append_only" ON public.salsabil_event_timeline;
CREATE POLICY "event_timeline_append_only"
  ON public.salsabil_event_timeline FOR INSERT
  TO authenticated
  WITH CHECK (actor_id IS NULL OR actor_id = auth.uid());

-- NO update/delete policies → effectively immutable. Hard guard via trigger:
CREATE OR REPLACE FUNCTION public.salsabil_event_timeline_block_mutation()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'salsabil_event_timeline is append-only';
END;
$$;

DROP TRIGGER IF EXISTS trg_event_timeline_no_update ON public.salsabil_event_timeline;
CREATE TRIGGER trg_event_timeline_no_update
  BEFORE UPDATE OR DELETE ON public.salsabil_event_timeline
  FOR EACH ROW EXECUTE FUNCTION public.salsabil_event_timeline_block_mutation();

-- 2. Append RPC — server-validated actor.
CREATE OR REPLACE FUNCTION public.log_sovereign_event(
  p_trace_id UUID,
  p_event_domain TEXT,
  p_event_type TEXT,
  p_payload JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  IF p_trace_id IS NULL OR p_event_domain IS NULL OR p_event_type IS NULL THEN
    RAISE EXCEPTION 'trace_id, event_domain and event_type are required';
  END IF;

  INSERT INTO public.salsabil_event_timeline (trace_id, actor_id, event_domain, event_type, payload)
  VALUES (p_trace_id, auth.uid(), p_event_domain, p_event_type, COALESCE(p_payload, '{}'::jsonb))
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_sovereign_event(UUID, TEXT, TEXT, JSONB) TO authenticated, anon;

-- 3. Seed default kill switches (idempotent).
INSERT INTO public.app_settings (key, value)
VALUES
  ('system_maintenance', 'false'::jsonb),
  ('payments_enabled', 'true'::jsonb),
  ('ai_orchestration_enabled', 'true'::jsonb)
ON CONFLICT (key) DO NOTHING;
