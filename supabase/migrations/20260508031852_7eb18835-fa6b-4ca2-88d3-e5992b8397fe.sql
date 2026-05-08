
ALTER TABLE public.salsabil_vendors
  ADD COLUMN IF NOT EXISTS commission_rate numeric NOT NULL DEFAULT 10;

CREATE TABLE IF NOT EXISTS public.salsabil_vendor_settlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES public.salsabil_vendors(id) ON DELETE CASCADE,
  node_id uuid NOT NULL REFERENCES public.salsabil_fulfillment_nodes(id) ON DELETE CASCADE,
  gross_amount numeric NOT NULL DEFAULT 0,
  platform_fee numeric NOT NULL DEFAULT 0,
  net_amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending_clearance',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (node_id)
);

CREATE INDEX IF NOT EXISTS idx_vendor_settlements_vendor ON public.salsabil_vendor_settlements(vendor_id, created_at DESC);

ALTER TABLE public.salsabil_vendor_settlements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins manage vendor settlements" ON public.salsabil_vendor_settlements;
CREATE POLICY "admins manage vendor settlements"
  ON public.salsabil_vendor_settlements
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "vendors read own settlements" ON public.salsabil_vendor_settlements;
CREATE POLICY "vendors read own settlements"
  ON public.salsabil_vendor_settlements
  FOR SELECT
  USING (public.current_user_is_vendor_member(vendor_id));

CREATE OR REPLACE FUNCTION public.trigger_auto_settlement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rate numeric;
  v_fee numeric;
  v_net numeric;
  v_gross numeric;
BEGIN
  IF NEW.status = 'delivered' AND (OLD.status IS DISTINCT FROM 'delivered') THEN
    SELECT COALESCE(commission_rate, 10) INTO v_rate
      FROM public.salsabil_vendors WHERE id = NEW.vendor_id;
    v_rate := COALESCE(v_rate, 10);
    v_gross := COALESCE(NEW.total_amount, 0);
    v_fee := ROUND((v_gross * v_rate / 100.0)::numeric, 2);
    v_net := v_gross - v_fee;

    INSERT INTO public.salsabil_vendor_settlements
      (vendor_id, node_id, gross_amount, platform_fee, net_amount)
    VALUES (NEW.vendor_id, NEW.id, v_gross, v_fee, v_net)
    ON CONFLICT (node_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auto_settlement_on_delivered ON public.salsabil_fulfillment_nodes;
CREATE TRIGGER auto_settlement_on_delivered
  AFTER UPDATE ON public.salsabil_fulfillment_nodes
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_auto_settlement();
