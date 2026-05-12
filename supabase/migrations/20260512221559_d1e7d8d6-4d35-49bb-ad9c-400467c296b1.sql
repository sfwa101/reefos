-- Vision Cortex Audit Ledger (Phase 1 · Step 1)
-- Append-only record of every AI inference handled by the Vision Cortex.

CREATE TABLE IF NOT EXISTS public.vision_inferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  input_hash TEXT NOT NULL,
  model TEXT NOT NULL,
  prompt_version TEXT NOT NULL,
  raw_output JSONB NOT NULL,
  draft_payload JSONB NOT NULL,
  state VARCHAR(16) NOT NULL DEFAULT 'pending'
    CHECK (state IN ('pending', 'approved', 'rejected')),
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vision_inferences_state_created
  ON public.vision_inferences (state, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_vision_inferences_input_hash
  ON public.vision_inferences (input_hash);

ALTER TABLE public.vision_inferences ENABLE ROW LEVEL SECURITY;

-- Admin-only access. Relies on existing public.has_role(uuid, app_role).
CREATE POLICY "Admins can view vision inferences"
  ON public.vision_inferences
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert vision inferences"
  ON public.vision_inferences
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update vision inference state"
  ON public.vision_inferences
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- No DELETE policy: append-only ledger.
