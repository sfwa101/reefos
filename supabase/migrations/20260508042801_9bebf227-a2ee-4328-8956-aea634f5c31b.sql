
-- Spine: bridge fulfillment nodes to drivers + geography + lifecycle
ALTER TABLE public.salsabil_fulfillment_nodes
  ADD COLUMN IF NOT EXISTS driver_id uuid REFERENCES public.drivers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_at timestamptz,
  ADD COLUMN IF NOT EXISTS picked_up_at timestamptz,
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz,
  ADD COLUMN IF NOT EXISTS pickup_lat numeric,
  ADD COLUMN IF NOT EXISTS pickup_lng numeric,
  ADD COLUMN IF NOT EXISTS dropoff_lat numeric,
  ADD COLUMN IF NOT EXISTS dropoff_lng numeric;

CREATE INDEX IF NOT EXISTS idx_fulfillment_nodes_driver
  ON public.salsabil_fulfillment_nodes(driver_id);

-- Helper: resolve current auth.uid() → drivers.id
CREATE OR REPLACE FUNCTION public.current_driver_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.drivers WHERE user_id = auth.uid() LIMIT 1
$$;

-- Driver visibility on fulfillment_nodes (additive; vendor + admin policies stay)
DROP POLICY IF EXISTS "Drivers read their assigned nodes" ON public.salsabil_fulfillment_nodes;
CREATE POLICY "Drivers read their assigned nodes"
  ON public.salsabil_fulfillment_nodes FOR SELECT
  TO authenticated
  USING (driver_id IS NOT NULL AND driver_id = public.current_driver_id());

DROP POLICY IF EXISTS "Drivers update their assigned nodes" ON public.salsabil_fulfillment_nodes;
CREATE POLICY "Drivers update their assigned nodes"
  ON public.salsabil_fulfillment_nodes FOR UPDATE
  TO authenticated
  USING (driver_id IS NOT NULL AND driver_id = public.current_driver_id())
  WITH CHECK (driver_id IS NOT NULL AND driver_id = public.current_driver_id());

-- VRP foundation: Delivery Legs
CREATE TABLE IF NOT EXISTS public.salsabil_delivery_legs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id uuid NOT NULL REFERENCES public.salsabil_fulfillment_nodes(id) ON DELETE CASCADE,
  driver_id uuid NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  sequence_index int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  route_geometry jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_delivery_legs_driver ON public.salsabil_delivery_legs(driver_id);
CREATE INDEX IF NOT EXISTS idx_delivery_legs_node ON public.salsabil_delivery_legs(node_id);

ALTER TABLE public.salsabil_delivery_legs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all delivery legs"
  ON public.salsabil_delivery_legs FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Drivers read their legs"
  ON public.salsabil_delivery_legs FOR SELECT
  TO authenticated
  USING (driver_id = public.current_driver_id());

CREATE POLICY "Drivers update their legs"
  ON public.salsabil_delivery_legs FOR UPDATE
  TO authenticated
  USING (driver_id = public.current_driver_id())
  WITH CHECK (driver_id = public.current_driver_id());

-- Driver Shifts
CREATE TABLE IF NOT EXISTS public.salsabil_driver_shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  start_lat numeric,
  start_lng numeric,
  gross_earnings numeric NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_driver_shifts_driver ON public.salsabil_driver_shifts(driver_id);

ALTER TABLE public.salsabil_driver_shifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all driver shifts"
  ON public.salsabil_driver_shifts FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Drivers read their shifts"
  ON public.salsabil_driver_shifts FOR SELECT
  TO authenticated
  USING (driver_id = public.current_driver_id());

CREATE POLICY "Drivers update their shifts"
  ON public.salsabil_driver_shifts FOR UPDATE
  TO authenticated
  USING (driver_id = public.current_driver_id())
  WITH CHECK (driver_id = public.current_driver_id());

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.salsabil_delivery_legs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.salsabil_driver_shifts;
