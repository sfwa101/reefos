-- Phase 12.2 — Smart Dispatch Engine

-- 1. Schema extensions
ALTER TABLE public.geo_zones
  ADD COLUMN IF NOT EXISTS dispatch_strategy text NOT NULL DEFAULT 'broadcast';

ALTER TABLE public.drivers
  ADD COLUMN IF NOT EXISTS vehicle_type text NOT NULL DEFAULT 'scooter',
  ADD COLUMN IF NOT EXISTS capabilities jsonb NOT NULL DEFAULT '{}'::jsonb;

-- 2. Dispatch offers table
CREATE TABLE IF NOT EXISTS public.salsabil_dispatch_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id uuid NOT NULL REFERENCES public.salsabil_fulfillment_nodes(id) ON DELETE CASCADE,
  driver_id uuid NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '45 seconds'),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dispatch_offers_node ON public.salsabil_dispatch_offers(node_id);
CREATE INDEX IF NOT EXISTS idx_dispatch_offers_driver_status ON public.salsabil_dispatch_offers(driver_id, status);

ALTER TABLE public.salsabil_dispatch_offers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins manage dispatch offers" ON public.salsabil_dispatch_offers;
CREATE POLICY "admins manage dispatch offers"
  ON public.salsabil_dispatch_offers
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "drivers view own offers" ON public.salsabil_dispatch_offers;
CREATE POLICY "drivers view own offers"
  ON public.salsabil_dispatch_offers
  FOR SELECT
  USING (driver_id = public.current_driver_id());

DROP POLICY IF EXISTS "drivers update own offers" ON public.salsabil_dispatch_offers;
CREATE POLICY "drivers update own offers"
  ON public.salsabil_dispatch_offers
  FOR UPDATE
  USING (driver_id = public.current_driver_id())
  WITH CHECK (driver_id = public.current_driver_id());

-- 3. Smart broadcaster
CREATE OR REPLACE FUNCTION public.broadcast_smart_dispatch(p_node_id uuid)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pickup_lat numeric;
  v_pickup_lng numeric;
  v_vendor_id uuid;
  v_vendor_lat numeric;
  v_vendor_lng numeric;
  v_distance_km numeric;
  v_cold boolean := false;
  v_count int := 0;
  v_allowed text[];
BEGIN
  SELECT n.pickup_lat, n.pickup_lng, n.vendor_id
    INTO v_pickup_lat, v_pickup_lng, v_vendor_id
  FROM public.salsabil_fulfillment_nodes n
  WHERE n.id = p_node_id;

  IF v_pickup_lat IS NULL OR v_pickup_lng IS NULL THEN
    -- nothing geographic to dispatch on
    RETURN 0;
  END IF;

  -- Vendor coords (best-effort — table may store lat/lng directly)
  BEGIN
    SELECT latitude, longitude INTO v_vendor_lat, v_vendor_lng
    FROM public.salsabil_vendors WHERE id = v_vendor_id;
  EXCEPTION WHEN undefined_column THEN
    v_vendor_lat := v_pickup_lat;
    v_vendor_lng := v_pickup_lng;
  END;

  IF v_vendor_lat IS NULL THEN
    v_vendor_lat := v_pickup_lat;
    v_vendor_lng := v_pickup_lng;
  END IF;

  -- Distance vendor -> pickup (km)
  v_distance_km := ST_Distance(
    ST_SetSRID(ST_MakePoint(v_vendor_lng, v_vendor_lat), 4326)::geography,
    ST_SetSRID(ST_MakePoint(v_pickup_lng, v_pickup_lat), 4326)::geography
  ) / 1000.0;

  -- Cold-chain detection
  SELECT EXISTS (
    SELECT 1
    FROM public.salsabil_fulfillment_items fi
    JOIN public.salsabil_assets a ON a.id = fi.asset_id
    WHERE fi.node_id = p_node_id
      AND COALESCE(a.traits->>'requires_cold_chain','false') = 'true'
  ) INTO v_cold;

  -- Vehicle bracket
  IF v_distance_km < 2 THEN
    v_allowed := ARRAY['walking','bicycle','scooter','car','refrigerated_truck'];
  ELSIF v_distance_km < 8 THEN
    v_allowed := ARRAY['scooter','car','refrigerated_truck'];
  ELSE
    v_allowed := ARRAY['car','refrigerated_truck'];
  END IF;

  -- Insert offers (45s expiry) for matched drivers within 10km of pickup
  WITH candidates AS (
    SELECT d.id AS driver_id
    FROM public.drivers d
    JOIN public.driver_positions dp ON dp.driver_id = d.id
    WHERE d.is_active = true
      AND d.vehicle_type = ANY(v_allowed)
      AND (
        NOT v_cold
        OR d.vehicle_type = 'refrigerated_truck'
        OR COALESCE(d.capabilities->>'has_cooler_box','false') = 'true'
      )
      AND ST_DWithin(
        dp.position::geography,
        ST_SetSRID(ST_MakePoint(v_pickup_lng, v_pickup_lat), 4326)::geography,
        10000
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.salsabil_dispatch_offers o
        WHERE o.node_id = p_node_id AND o.driver_id = d.id AND o.status = 'pending'
      )
    LIMIT 25
  ),
  ins AS (
    INSERT INTO public.salsabil_dispatch_offers (node_id, driver_id, expires_at)
    SELECT p_node_id, c.driver_id, now() + interval '45 seconds' FROM candidates c
    RETURNING id
  )
  SELECT count(*) INTO v_count FROM ins;

  -- Cold-chain firewall
  IF v_count = 0 AND v_cold AND v_distance_km >= 2 THEN
    UPDATE public.salsabil_fulfillment_nodes
       SET status = 'requires_admin_routing'
     WHERE id = p_node_id;
    RETURN 0;
  END IF;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.broadcast_smart_dispatch(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.broadcast_smart_dispatch(uuid) TO authenticated, service_role;

-- 4. Transactional acceptance
CREATE OR REPLACE FUNCTION public.accept_dispatch_offer(p_offer_id uuid, p_driver_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_node_id uuid;
  v_status text;
  v_expires timestamptz;
  v_node_driver uuid;
BEGIN
  SELECT node_id, status, expires_at
    INTO v_node_id, v_status, v_expires
  FROM public.salsabil_dispatch_offers
  WHERE id = p_offer_id AND driver_id = p_driver_id
  FOR UPDATE;

  IF v_node_id IS NULL THEN RETURN false; END IF;
  IF v_status <> 'pending' THEN RETURN false; END IF;
  IF v_expires < now() THEN
    UPDATE public.salsabil_dispatch_offers SET status = 'expired' WHERE id = p_offer_id;
    RETURN false;
  END IF;

  SELECT driver_id INTO v_node_driver
  FROM public.salsabil_fulfillment_nodes
  WHERE id = v_node_id
  FOR UPDATE;

  IF v_node_driver IS NOT NULL THEN
    UPDATE public.salsabil_dispatch_offers SET status = 'missed' WHERE id = p_offer_id;
    RETURN false;
  END IF;

  UPDATE public.salsabil_fulfillment_nodes
     SET driver_id = p_driver_id,
         assigned_at = now(),
         status = CASE WHEN status IN ('pending','confirmed') THEN 'preparing' ELSE status END
   WHERE id = v_node_id;

  UPDATE public.salsabil_dispatch_offers SET status = 'accepted' WHERE id = p_offer_id;
  UPDATE public.salsabil_dispatch_offers
     SET status = 'missed'
   WHERE node_id = v_node_id AND id <> p_offer_id AND status = 'pending';

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.accept_dispatch_offer(uuid, uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.accept_dispatch_offer(uuid, uuid) TO authenticated, service_role;
