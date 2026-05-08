-- Phase 9 Part 4 — Multi-vendor fulfillment routing
CREATE TABLE IF NOT EXISTS public.salsabil_fulfillment_nodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  master_order_id uuid,
  vendor_id uuid NOT NULL REFERENCES public.salsabil_vendors(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  total_amount numeric(14,2) NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fulfillment_nodes_vendor ON public.salsabil_fulfillment_nodes(vendor_id);
CREATE INDEX IF NOT EXISTS idx_fulfillment_nodes_master ON public.salsabil_fulfillment_nodes(master_order_id);
CREATE INDEX IF NOT EXISTS idx_fulfillment_nodes_status ON public.salsabil_fulfillment_nodes(status);

CREATE TABLE IF NOT EXISTS public.salsabil_fulfillment_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id uuid NOT NULL REFERENCES public.salsabil_fulfillment_nodes(id) ON DELETE CASCADE,
  sku_id uuid NOT NULL,
  quantity int NOT NULL CHECK (quantity > 0),
  price_at_time numeric(14,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fulfillment_items_node ON public.salsabil_fulfillment_items(node_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fulfillment_nodes_touch ON public.salsabil_fulfillment_nodes;
CREATE TRIGGER trg_fulfillment_nodes_touch
BEFORE UPDATE ON public.salsabil_fulfillment_nodes
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.salsabil_fulfillment_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salsabil_fulfillment_items ENABLE ROW LEVEL SECURITY;

-- Helper: is the calling user a member of vendor X?
CREATE OR REPLACE FUNCTION public.current_user_is_vendor_member(_vendor_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.salsabil_vendor_members
    WHERE user_id = auth.uid() AND vendor_id = _vendor_id
  );
$$;

-- Nodes policies
DROP POLICY IF EXISTS "Admins manage all fulfillment nodes" ON public.salsabil_fulfillment_nodes;
CREATE POLICY "Admins manage all fulfillment nodes"
ON public.salsabil_fulfillment_nodes FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Vendor members read their fulfillment nodes" ON public.salsabil_fulfillment_nodes;
CREATE POLICY "Vendor members read their fulfillment nodes"
ON public.salsabil_fulfillment_nodes FOR SELECT TO authenticated
USING (public.current_user_is_vendor_member(vendor_id));

DROP POLICY IF EXISTS "Vendor members update their fulfillment nodes" ON public.salsabil_fulfillment_nodes;
CREATE POLICY "Vendor members update their fulfillment nodes"
ON public.salsabil_fulfillment_nodes FOR UPDATE TO authenticated
USING (public.current_user_is_vendor_member(vendor_id))
WITH CHECK (public.current_user_is_vendor_member(vendor_id));

-- Items policies
DROP POLICY IF EXISTS "Admins manage all fulfillment items" ON public.salsabil_fulfillment_items;
CREATE POLICY "Admins manage all fulfillment items"
ON public.salsabil_fulfillment_items FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Vendor members read their fulfillment items" ON public.salsabil_fulfillment_items;
CREATE POLICY "Vendor members read their fulfillment items"
ON public.salsabil_fulfillment_items FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.salsabil_fulfillment_nodes n
    WHERE n.id = salsabil_fulfillment_items.node_id
      AND public.current_user_is_vendor_member(n.vendor_id)
  )
);