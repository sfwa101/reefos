CREATE OR REPLACE FUNCTION public.update_universal_asset(
  p_asset_id uuid,
  p_name text,
  p_description text,
  p_base_price numeric
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_caller    uuid := auth.uid();
  v_contract  uuid;
  v_legacy_id text;
BEGIN
  IF v_caller IS NULL OR NOT public.has_role(v_caller, 'admin') THEN
    RAISE EXCEPTION 'unauthorized: admin role required to update USA';
  END IF;

  IF p_asset_id IS NULL THEN
    RAISE EXCEPTION 'invalid input: p_asset_id is required';
  END IF;

  -- 1) Update the asset itself
  UPDATE public.salsabil_assets
     SET name        = COALESCE(NULLIF(p_name, ''), name),
         description = p_description,
         updated_at  = now()
   WHERE id = p_asset_id;

  -- 2) Update the active (or first) financial contract attached to this asset's SKUs
  SELECT fc.id INTO v_contract
    FROM public.salsabil_financial_contracts fc
    JOIN public.salsabil_skus s ON s.id = fc.sku_id
   WHERE s.asset_id = p_asset_id
   ORDER BY fc.is_active DESC, fc.valid_from DESC NULLS LAST, fc.created_at DESC
   LIMIT 1;

  IF v_contract IS NOT NULL AND p_base_price IS NOT NULL THEN
    UPDATE public.salsabil_financial_contracts
       SET base_price = p_base_price,
           updated_at = now()
     WHERE id = v_contract;
  END IF;

  -- 3) Legacy shim sync (deterministic id used by mint_universal_asset)
  v_legacy_id := 'usa_' || replace(p_asset_id::text, '-', '');
  UPDATE public.products
     SET name        = COALESCE(NULLIF(p_name, ''), name),
         description = p_description,
         price       = COALESCE(p_base_price, price)
   WHERE id = v_legacy_id;

  RETURN p_asset_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.update_universal_asset(uuid, text, text, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_universal_asset(uuid, text, text, numeric) TO authenticated;