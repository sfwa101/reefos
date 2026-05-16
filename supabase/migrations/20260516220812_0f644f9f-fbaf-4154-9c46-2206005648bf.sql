
CREATE TABLE IF NOT EXISTS public.khalil_intelligence_snapshot (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  identity_level TEXT NOT NULL,
  recovery_mode TEXT NOT NULL,
  signals JSONB NOT NULL DEFAULT '[]'::jsonb,
  priorities JSONB NOT NULL DEFAULT '[]'::jsonb,
  nudges JSONB NOT NULL DEFAULT '[]'::jsonb,
  weekly_focus JSONB NOT NULL DEFAULT '{}'::jsonb,
  inputs_digest TEXT NOT NULL,
  replay_version INT NOT NULL DEFAULT 1,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_khalil_intel_snapshot_user_time
  ON public.khalil_intelligence_snapshot (user_id, generated_at DESC);

ALTER TABLE public.khalil_intelligence_snapshot ENABLE ROW LEVEL SECURITY;

CREATE POLICY "khalil_intel_snapshot_select_own"
  ON public.khalil_intelligence_snapshot
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "khalil_intel_snapshot_insert_own"
  ON public.khalil_intelligence_snapshot
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Append-only: block updates + deletes for users; replay runs via service role.
CREATE POLICY "khalil_intel_snapshot_no_update"
  ON public.khalil_intelligence_snapshot
  FOR UPDATE
  USING (false);

CREATE POLICY "khalil_intel_snapshot_no_delete"
  ON public.khalil_intelligence_snapshot
  FOR DELETE
  USING (false);
