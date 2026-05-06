
-- Phase T-B: PostGIS Logistics Layer
CREATE EXTENSION IF NOT EXISTS postgis;

-- Driver live telemetry
CREATE TABLE IF NOT EXISTS public.driver_positions (
  driver_id   uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  position    geography(Point, 4326) NOT NULL,
  heading_deg smallint,
  speed_kmh   smallint,
  battery_pct smallint,
  status      text NOT NULL DEFAULT 'OFFLINE' CHECK (status IN ('IDLE','EN_ROUTE','OFFLINE','BREAK')),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_driver_positions_gist
  ON public.driver_positions USING GIST(position);
CREATE INDEX IF NOT EXISTS idx_driver_positions_idle
  ON public.driver_positions(status) WHERE status = 'IDLE';
CREATE INDEX IF NOT EXISTS idx_driver_positions_updated
  ON public.driver_positions(updated_at DESC);

ALTER TABLE public.driver_positions ENABLE ROW LEVEL SECURITY;

-- Drivers: upsert/update only their own row
DROP POLICY IF EXISTS "drivers update own row" ON public.driver_positions;
CREATE POLICY "drivers update own row"
ON public.driver_positions
FOR UPDATE
TO authenticated
USING (auth.uid() = driver_id)
WITH CHECK (auth.uid() = driver_id);

DROP POLICY IF EXISTS "drivers insert own row" ON public.driver_positions;
CREATE POLICY "drivers insert own row"
ON public.driver_positions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = driver_id);

DROP POLICY IF EXISTS "drivers see own row" ON public.driver_positions;
CREATE POLICY "drivers see own row"
ON public.driver_positions
FOR SELECT
TO authenticated
USING (auth.uid() = driver_id);

-- Admins: full SELECT (assumes has_role(uid, 'admin') exists from prior phases)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'has_role') THEN
    EXECUTE $POL$
      DROP POLICY IF EXISTS "admins read all driver positions" ON public.driver_positions;
      CREATE POLICY "admins read all driver positions"
      ON public.driver_positions FOR SELECT TO authenticated
      USING (public.has_role(auth.uid(), 'admin'));
    $POL$;
  END IF;
END $$;

-- Delivery polygons (geofences)
CREATE TABLE IF NOT EXISTS public.delivery_polygons (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_name  text NOT NULL,
  area       geography(Polygon, 4326) NOT NULL,
  surge_x    numeric(4,2) NOT NULL DEFAULT 1.0,
  is_active  boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_delivery_polygons_gist
  ON public.delivery_polygons USING GIST(area);

ALTER TABLE public.delivery_polygons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anyone reads active polygons" ON public.delivery_polygons;
CREATE POLICY "anyone reads active polygons"
ON public.delivery_polygons FOR SELECT TO authenticated
USING (is_active = true);

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'has_role') THEN
    EXECUTE $POL$
      DROP POLICY IF EXISTS "admins manage polygons" ON public.delivery_polygons;
      CREATE POLICY "admins manage polygons"
      ON public.delivery_polygons FOR ALL TO authenticated
      USING (public.has_role(auth.uid(), 'admin'))
      WITH CHECK (public.has_role(auth.uid(), 'admin'));
    $POL$;
  END IF;
END $$;

-- RPC: nearest idle drivers within radius
CREATE OR REPLACE FUNCTION public.find_nearest_drivers(
  p_lat numeric,
  p_lng numeric,
  p_radius_m int DEFAULT 5000,
  p_limit int DEFAULT 5
) RETURNS TABLE(driver_id uuid, distance_m numeric, updated_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    dp.driver_id,
    ST_Distance(dp.position, ST_MakePoint(p_lng, p_lat)::geography)::numeric AS distance_m,
    dp.updated_at
  FROM public.driver_positions dp
  WHERE dp.status = 'IDLE'
    AND dp.updated_at > now() - interval '5 minutes'
    AND ST_DWithin(dp.position, ST_MakePoint(p_lng, p_lat)::geography, p_radius_m)
  ORDER BY dp.position <-> ST_MakePoint(p_lng, p_lat)::geography
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION public.find_nearest_drivers(numeric, numeric, int, int) TO authenticated;
