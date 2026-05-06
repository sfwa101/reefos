
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS driver_id uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS delivery_lat numeric(10,7),
  ADD COLUMN IF NOT EXISTS delivery_lng numeric(10,7),
  ADD COLUMN IF NOT EXISTS dispatched_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_orders_driver ON public.orders(driver_id) WHERE driver_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_dispatch_queue ON public.orders(status) WHERE status = 'QUEUED_FOR_DISPATCH';

CREATE OR REPLACE FUNCTION public.assign_nearest_driver(
  p_order_id uuid,
  p_radius_m int DEFAULT 5000
) RETURNS TABLE(order_id uuid, driver_id uuid, distance_m numeric, queued boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lat numeric;
  v_lng numeric;
  v_driver uuid;
  v_dist  numeric;
BEGIN
  SELECT delivery_lat, delivery_lng INTO v_lat, v_lng
  FROM public.orders WHERE id = p_order_id;

  IF v_lat IS NULL OR v_lng IS NULL THEN
    UPDATE public.orders
       SET status = 'QUEUED_FOR_DISPATCH', dispatched_at = now()
     WHERE id = p_order_id;
    RETURN QUERY SELECT p_order_id, NULL::uuid, NULL::numeric, true;
    RETURN;
  END IF;

  SELECT fnd.driver_id, fnd.distance_m
    INTO v_driver, v_dist
  FROM public.find_nearest_drivers(v_lat, v_lng, p_radius_m, 1) fnd
  LIMIT 1;

  IF v_driver IS NULL THEN
    UPDATE public.orders
       SET status = 'QUEUED_FOR_DISPATCH', dispatched_at = now()
     WHERE id = p_order_id;
    RETURN QUERY SELECT p_order_id, NULL::uuid, NULL::numeric, true;
    RETURN;
  END IF;

  UPDATE public.orders
     SET driver_id = v_driver,
         status = 'ASSIGNED',
         dispatched_at = now()
   WHERE id = p_order_id;

  UPDATE public.driver_positions
     SET status = 'EN_ROUTE', updated_at = now()
   WHERE driver_positions.driver_id = v_driver;

  RETURN QUERY SELECT p_order_id, v_driver, v_dist, false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.assign_nearest_driver(uuid, int) TO authenticated;
