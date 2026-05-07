-- Ensure unique (sku_id, location_code) so the upsert can target it
CREATE UNIQUE INDEX IF NOT EXISTS uq_salsabil_inventory_sku_location
  ON public.salsabil_inventory_matrix (sku_id, COALESCE(location_code, ''));

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
  v_loc text := COALESCE(p_location_id, '');
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'unauthorized';
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

REVOKE ALL ON FUNCTION public.upsert_inventory_matrix(uuid, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_inventory_matrix(uuid, text, text, jsonb) TO authenticated;