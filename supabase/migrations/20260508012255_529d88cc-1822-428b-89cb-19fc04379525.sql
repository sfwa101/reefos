-- Phase 9 Part 3: allow vendor members to upsert inventory rows for their own tenant
CREATE OR REPLACE FUNCTION public.upsert_inventory_matrix(
  p_sku_id uuid,
  p_location_id text,
  p_inventory_type text,
  p_availability jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_vendor_id uuid;
  v_is_admin boolean := public.has_role(auth.uid(), 'admin'::app_role);
  v_is_vendor_for_location boolean := false;
BEGIN
  -- If caller is not admin, check if location_id is a vendor uuid they belong to
  IF NOT v_is_admin THEN
    BEGIN
      v_vendor_id := NULLIF(p_location_id, '')::uuid;
    EXCEPTION WHEN OTHERS THEN
      v_vendor_id := NULL;
    END;

    IF v_vendor_id IS NOT NULL THEN
      SELECT EXISTS (
        SELECT 1 FROM public.salsabil_vendor_members
        WHERE user_id = auth.uid() AND vendor_id = v_vendor_id
      ) INTO v_is_vendor_for_location;
    END IF;

    IF NOT v_is_vendor_for_location THEN
      RAISE EXCEPTION 'unauthorized';
    END IF;
  END IF;

  INSERT INTO public.salsabil_inventory_matrix
    (sku_id, location_code, inventory_type, availability_data)
  VALUES
    (p_sku_id, NULLIF(p_location_id, ''), p_inventory_type::salsabil_inventory_type, COALESCE(p_availability, '{}'::jsonb))
  ON CONFLICT (sku_id, COALESCE(location_code, ''))
  DO UPDATE SET
    inventory_type = EXCLUDED.inventory_type,
    availability_data = EXCLUDED.availability_data,
    updated_at = now()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_inventory_matrix(uuid, text, text, jsonb) TO authenticated;

-- Allow vendor members to read their own inventory matrix rows
DROP POLICY IF EXISTS "Vendor members read their inventory" ON public.salsabil_inventory_matrix;
CREATE POLICY "Vendor members read their inventory"
ON public.salsabil_inventory_matrix
FOR SELECT
TO authenticated
USING (
  location_code IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.salsabil_vendor_members vm
    WHERE vm.user_id = auth.uid()
      AND vm.vendor_id::text = public.salsabil_inventory_matrix.location_code
  )
);