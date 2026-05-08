
-- =========================================================
-- Phase 12.4 — Logistics Pricing Kernel + Modesty + Rideshare
-- =========================================================

-- 1) Logistics pricing config (per zone)
CREATE TABLE IF NOT EXISTS public.salsabil_logistics_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id text,
  base_fee numeric NOT NULL DEFAULT 15,
  per_km_fee numeric NOT NULL DEFAULT 2,
  free_delivery_threshold numeric NOT NULL DEFAULT 500,
  surge_multiplier numeric NOT NULL DEFAULT 1.0,
  speed_tiers jsonb NOT NULL DEFAULT '{"express": 1.5, "standard": 1.0, "economy": 0.7}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS salsabil_logistics_config_zone_uniq
  ON public.salsabil_logistics_config (COALESCE(zone_id, '__default__'));

ALTER TABLE public.salsabil_logistics_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "logistics_config_read_all" ON public.salsabil_logistics_config;
CREATE POLICY "logistics_config_read_all"
  ON public.salsabil_logistics_config FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "logistics_config_admin_write" ON public.salsabil_logistics_config;
CREATE POLICY "logistics_config_admin_write"
  ON public.salsabil_logistics_config FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Default global config
INSERT INTO public.salsabil_logistics_config (zone_id)
SELECT NULL
WHERE NOT EXISTS (
  SELECT 1 FROM public.salsabil_logistics_config WHERE zone_id IS NULL
);

-- 2) Gender column on profiles (for Modesty Filter)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='profiles' AND column_name='gender'
  ) THEN
    ALTER TABLE public.profiles
      ADD COLUMN gender text
        CHECK (gender IN ('male','female','other'));
  END IF;
END$$;

-- 3) Rideshare pool (BlaBlaCar foundation)
CREATE TABLE IF NOT EXISTS public.salsabil_rideshare_pool (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  origin_lat numeric,
  origin_lng numeric,
  dest_lat numeric,
  dest_lng numeric,
  available_seats int NOT NULL DEFAULT 0,
  trunk_capacity_liters int NOT NULL DEFAULT 0,
  departure_at timestamptz,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.salsabil_rideshare_pool ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rideshare_read_active" ON public.salsabil_rideshare_pool;
CREATE POLICY "rideshare_read_active"
  ON public.salsabil_rideshare_pool FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "rideshare_owner_write" ON public.salsabil_rideshare_pool;
CREATE POLICY "rideshare_owner_write"
  ON public.salsabil_rideshare_pool FOR ALL
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "rideshare_admin_all" ON public.salsabil_rideshare_pool;
CREATE POLICY "rideshare_admin_all"
  ON public.salsabil_rideshare_pool FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS rideshare_pool_status_idx
  ON public.salsabil_rideshare_pool (status, departure_at);

-- 4) Modesty-aware broadcaster
CREATE OR REPLACE FUNCTION public.broadcast_smart_dispatch(p_node_id uuid)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_node           public.salsabil_fulfillment_nodes%ROWTYPE;
  v_master         public.salsabil_master_orders%ROWTYPE;
  v_customer_gender text;
  v_pickup_geog    geography;
  v_requires_cold  boolean := false;
  v_offers_count   int     := 0;
  v_female_only    boolean;
BEGIN
  SELECT * INTO v_node
  FROM public.salsabil_fulfillment_nodes
  WHERE id = p_node_id
  FOR UPDATE;

  IF v_node.id IS NULL THEN
    RETURN 0;
  END IF;

  SELECT * INTO v_master
  FROM public.salsabil_master_orders
  WHERE id = v_node.master_order_id;

  -- Customer gender (Modesty Filter input)
  SELECT gender INTO v_customer_gender
  FROM public.profiles
  WHERE id = v_master.customer_id;

  v_female_only := COALESCE(v_customer_gender, '') = 'female';

  -- Cold-chain detection
  SELECT EXISTS (
    SELECT 1
    FROM public.salsabil_fulfillment_items fi
    JOIN public.salsabil_assets a ON a.id = fi.asset_id
    WHERE fi.node_id = p_node_id
      AND COALESCE(a.traits->>'requires_cold_chain','false')::boolean = true
  ) INTO v_requires_cold;

  v_pickup_geog := ST_SetSRID(ST_MakePoint(v_node.pickup_lng, v_node.pickup_lat), 4326)::geography;

  -- Pass 1: Female-only candidates (if customer is female)
  IF v_female_only THEN
    INSERT INTO public.salsabil_dispatch_offers (node_id, driver_id, status, expires_at)
    SELECT p_node_id, d.id, 'pending', now() + interval '45 seconds'
    FROM public.drivers d
    JOIN public.profiles p ON p.id = d.user_id
    JOIN public.driver_positions dp ON dp.driver_id = d.id
    WHERE p.gender = 'female'
      AND ST_DWithin(dp.position::geography, v_pickup_geog, 10000)
      AND (
        NOT v_requires_cold
        OR d.vehicle_type = 'refrigerated_truck'
        OR COALESCE(d.capabilities->>'has_cooler_box','false')::boolean = true
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.salsabil_dispatch_offers o
        WHERE o.node_id = p_node_id AND o.driver_id = d.id
      );
    GET DIAGNOSTICS v_offers_count = ROW_COUNT;

    IF v_offers_count > 0 THEN
      RETURN v_offers_count;
    END IF;
    -- Sovereign Override: fall through to standard routing
  END IF;

  -- Pass 2: Standard smart routing (vehicle/cold-chain aware)
  INSERT INTO public.salsabil_dispatch_offers (node_id, driver_id, status, expires_at)
  SELECT p_node_id, d.id, 'pending', now() + interval '45 seconds'
  FROM public.drivers d
  JOIN public.driver_positions dp ON dp.driver_id = d.id
  WHERE ST_DWithin(dp.position::geography, v_pickup_geog, 10000)
    AND (
      NOT v_requires_cold
      OR d.vehicle_type = 'refrigerated_truck'
      OR COALESCE(d.capabilities->>'has_cooler_box','false')::boolean = true
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.salsabil_dispatch_offers o
      WHERE o.node_id = p_node_id AND o.driver_id = d.id
    );
  GET DIAGNOSTICS v_offers_count = ROW_COUNT;

  -- Cold-chain firewall
  IF v_requires_cold AND v_offers_count = 0 THEN
    UPDATE public.salsabil_fulfillment_nodes
       SET status = 'requires_admin_routing'
     WHERE id = p_node_id;
  END IF;

  RETURN v_offers_count;
END;
$$;

-- 5) Sovereign logistics quote
CREATE OR REPLACE FUNCTION public.get_sovereign_logistics_quote(
  p_zone_id text,
  p_distance_km numeric,
  p_cart_total numeric,
  p_speed_tier text DEFAULT 'standard'
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cfg     public.salsabil_logistics_config%ROWTYPE;
  v_speed   numeric;
  v_fee     numeric;
  v_eta_min int;
BEGIN
  SELECT * INTO v_cfg
  FROM public.salsabil_logistics_config
  WHERE zone_id = p_zone_id
  LIMIT 1;

  IF v_cfg.id IS NULL THEN
    SELECT * INTO v_cfg
    FROM public.salsabil_logistics_config
    WHERE zone_id IS NULL
    LIMIT 1;
  END IF;

  IF v_cfg.id IS NULL THEN
    RETURN jsonb_build_object('fee', 0, 'eta_minutes', 30, 'free', true, 'reason', 'no_config');
  END IF;

  v_speed := COALESCE((v_cfg.speed_tiers->>p_speed_tier)::numeric, 1.0);

  IF p_cart_total >= v_cfg.free_delivery_threshold THEN
    v_fee := 0;
  ELSE
    v_fee := (v_cfg.base_fee + (p_distance_km * v_cfg.per_km_fee))
           * v_cfg.surge_multiplier
           * v_speed;
  END IF;

  -- ETA: 4 min/km baseline, scaled inversely by speed tier
  v_eta_min := GREATEST(10, CEIL((p_distance_km * 4) / NULLIF(v_speed, 0))::int);

  RETURN jsonb_build_object(
    'fee', ROUND(v_fee::numeric, 2),
    'eta_minutes', v_eta_min,
    'free', (p_cart_total >= v_cfg.free_delivery_threshold),
    'speed_tier', p_speed_tier,
    'surge_multiplier', v_cfg.surge_multiplier,
    'zone_id', p_zone_id
  );
END;
$$;
