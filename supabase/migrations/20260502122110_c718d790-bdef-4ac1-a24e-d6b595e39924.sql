
-- 1. Fix service_type check to allow values used by the app
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_service_type_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_service_type_check
  CHECK (service_type = ANY (ARRAY['standard'::text,'express'::text,'scheduled'::text,'delivery'::text,'pickup'::text,'dine_in'::text]));

-- 2. Fix recursive RLS: vendor policy on orders queried order_items, whose policy queries orders.
--    Replace with a SECURITY DEFINER helper that bypasses RLS on the inner lookup.
CREATE OR REPLACE FUNCTION public.order_has_vendor_store(_order_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.order_items oi
    WHERE oi.order_id = _order_id
      AND oi.store_id IN (SELECT public.user_store_ids(_user_id))
  );
$$;

DROP POLICY IF EXISTS "Vendors view orders containing their store items" ON public.orders;
CREATE POLICY "Vendors view orders containing their store items"
ON public.orders FOR SELECT
TO authenticated
USING (public.order_has_vendor_store(id, auth.uid()));
