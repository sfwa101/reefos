-- Cashier Snapshots Ledger (Article 7.1 — Append-only Audit)
CREATE TABLE IF NOT EXISTS public.cashier_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_hash TEXT UNIQUE NOT NULL,
  input_payload JSONB NOT NULL,
  output_payload JSONB NOT NULL,
  actor_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cashier_snapshots_created_at
  ON public.cashier_snapshots (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cashier_snapshots_actor
  ON public.cashier_snapshots (actor_id);

ALTER TABLE public.cashier_snapshots ENABLE ROW LEVEL SECURITY;

-- Admin-only SELECT (uses existing has_role(uuid, app_role) helper)
DROP POLICY IF EXISTS "Admins can view cashier snapshots"
  ON public.cashier_snapshots;
CREATE POLICY "Admins can view cashier snapshots"
  ON public.cashier_snapshots
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- No INSERT/UPDATE/DELETE policies for client roles → append-only
-- Inserts are performed by the backend service role, which bypasses RLS.
