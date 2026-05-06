CREATE EXTENSION IF NOT EXISTS postgis;

ALTER TABLE public.drivers     ADD COLUMN IF NOT EXISTS location geography(Point,4326);
ALTER TABLE public.addresses   ADD COLUMN IF NOT EXISTS location geography(Point,4326);
ALTER TABLE public.geo_zones   ADD COLUMN IF NOT EXISTS location geography(Point,4326);
ALTER TABLE public.branches    ADD COLUMN IF NOT EXISTS location geography(Point,4326);
ALTER TABLE public.warehouses  ADD COLUMN IF NOT EXISTS location geography(Point,4326);
ALTER TABLE public.delivery_tasks ADD COLUMN IF NOT EXISTS driver_location geography(Point,4326);

CREATE INDEX IF NOT EXISTS idx_drivers_location_gist        ON public.drivers       USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_addresses_location_gist      ON public.addresses     USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_geo_zones_location_gist      ON public.geo_zones     USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_branches_location_gist       ON public.branches      USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_warehouses_location_gist     ON public.warehouses    USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_delivery_tasks_loc_gist      ON public.delivery_tasks USING GIST (driver_location);

CREATE OR REPLACE FUNCTION public.tg_sync_location_from_latlng()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_lat numeric;
  v_lng numeric;
  v_lat_col text := TG_ARGV[0];
  v_lng_col text := TG_ARGV[1];
  v_loc_col text := TG_ARGV[2];
  v_row jsonb := to_jsonb(NEW);
BEGIN
  v_lat := NULLIF(v_row ->> v_lat_col, '')::numeric;
  v_lng := NULLIF(v_row ->> v_lng_col, '')::numeric;
  IF v_lat IS NOT NULL AND v_lng IS NOT NULL THEN
    NEW := jsonb_populate_record(
      NEW,
      jsonb_build_object(
        v_loc_col,
        ST_SetSRID(ST_MakePoint(v_lng::float8, v_lat::float8), 4326)::text
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_drivers_location ON public.drivers;
CREATE TRIGGER trg_sync_drivers_location
  BEFORE INSERT OR UPDATE OF current_lat, current_lng ON public.drivers
  FOR EACH ROW EXECUTE FUNCTION public.tg_sync_location_from_latlng('current_lat','current_lng','location');

DROP TRIGGER IF EXISTS trg_sync_addresses_location ON public.addresses;
CREATE TRIGGER trg_sync_addresses_location
  BEFORE INSERT OR UPDATE OF lat, lng ON public.addresses
  FOR EACH ROW EXECUTE FUNCTION public.tg_sync_location_from_latlng('lat','lng','location');

DROP TRIGGER IF EXISTS trg_sync_delivery_tasks_location ON public.delivery_tasks;
CREATE TRIGGER trg_sync_delivery_tasks_location
  BEFORE INSERT OR UPDATE OF driver_lat, driver_lng ON public.delivery_tasks
  FOR EACH ROW EXECUTE FUNCTION public.tg_sync_location_from_latlng('driver_lat','driver_lng','driver_location');

UPDATE public.drivers SET location = ST_SetSRID(ST_MakePoint(current_lng::float8, current_lat::float8),4326)::geography
  WHERE location IS NULL AND current_lat IS NOT NULL AND current_lng IS NOT NULL;
UPDATE public.addresses SET location = ST_SetSRID(ST_MakePoint(lng::float8, lat::float8),4326)::geography
  WHERE location IS NULL AND lat IS NOT NULL AND lng IS NOT NULL;
UPDATE public.delivery_tasks SET driver_location = ST_SetSRID(ST_MakePoint(driver_lng::float8, driver_lat::float8),4326)::geography
  WHERE driver_location IS NULL AND driver_lat IS NOT NULL AND driver_lng IS NOT NULL;

CREATE OR REPLACE FUNCTION public.dispatch_nearest_drivers(
  p_lat double precision,
  p_lng double precision,
  p_radius_meters double precision DEFAULT 5000,
  p_limit integer DEFAULT 10
) RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH origin AS (
    SELECT ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography AS g
  )
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb)
  FROM (
    SELECT
      d.id,
      d.user_id,
      d.full_name,
      d.phone,
      d.vehicle_plate,
      d.vehicle_type,
      d.last_seen_at,
      ST_Y(d.location::geometry) AS lat,
      ST_X(d.location::geometry) AS lng,
      ST_Distance(d.location, (SELECT g FROM origin))::int AS distance_m
    FROM public.drivers d, origin
    WHERE d.location IS NOT NULL
      AND COALESCE(d.is_active, true) = true
      AND ST_DWithin(d.location, origin.g, p_radius_meters)
    ORDER BY d.location <-> origin.g
    LIMIT GREATEST(1, LEAST(p_limit, 100))
  ) t;
$$;

REVOKE ALL ON FUNCTION public.dispatch_nearest_drivers(double precision, double precision, double precision, integer) FROM public;
GRANT EXECUTE ON FUNCTION public.dispatch_nearest_drivers(double precision, double precision, double precision, integer) TO authenticated;

ALTER TABLE public.drivers        REPLICA IDENTITY FULL;
ALTER TABLE public.delivery_tasks REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.drivers;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.delivery_tasks;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;