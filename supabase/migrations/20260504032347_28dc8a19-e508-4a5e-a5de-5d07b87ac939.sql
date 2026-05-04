-- Phase 9.1 — Admin override audit trail.
-- Every time an admin bypasses the LossPreventionRule via `adminOverride`,
-- we persist a tamper-evident row here. INSERT-only by design.

CREATE TABLE public.admin_override_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_user_id UUID NOT NULL,
  cart_id UUID,
  order_id UUID,
  product_id TEXT,
  original_grand_total NUMERIC(12, 2),
  overridden_grand_total NUMERIC(12, 2),
  reason TEXT NOT NULL,
  loss_prevention_reason TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_admin_override_logs_admin
  ON public.admin_override_logs (admin_user_id, created_at DESC);
CREATE INDEX idx_admin_override_logs_product
  ON public.admin_override_logs (product_id) WHERE product_id IS NOT NULL;

ALTER TABLE public.admin_override_logs ENABLE ROW LEVEL SECURITY;

-- READ: admins only.
CREATE POLICY "Admins can read override logs"
  ON public.admin_override_logs
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- INSERT: only the acting admin can write their own row.
CREATE POLICY "Admins can insert their own override logs"
  ON public.admin_override_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    AND admin_user_id = auth.uid()
  );

-- No UPDATE / DELETE policies => effectively immutable for non-superuser.