-- PHASE 15.1: SDUI CATALOG CUTOVER — Burn the products shim.

-- 1) Rewrite mint_universal_asset to remove the products dual-write block.
CREATE OR REPLACE FUNCTION public.mint_universal_asset(payload jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_caller       uuid := auth.uid();
  v_asset_id     uuid;
  v_sku          jsonb;
  v_new_sku_id   uuid;
  v_sort         int := 0;
  v_asset_type   public.salsabil_asset_type;
  v_pricing      public.salsabil_pricing_model;
  v_base_price   numeric;
  v_currency     text;
  v_contract_rules jsonb;
  v_embedding    vector(768);
  v_emb_json     jsonb;
  v_media        jsonb;
BEGIN
  IF v_caller IS NULL OR NOT public.has_role(v_caller, 'admin') THEN
    RAISE EXCEPTION 'unauthorized: admin role required to mint USA';
  END IF;

  IF payload IS NULL OR payload->'asset' IS NULL THEN
    RAISE EXCEPTION 'invalid payload: missing asset';
  END IF;

  v_asset_type := COALESCE(NULLIF(payload->'asset'->>'asset_type',''),'physical')::public.salsabil_asset_type;

  v_emb_json := payload->'semantic_embedding';
  IF v_emb_json IS NOT NULL AND jsonb_typeof(v_emb_json) = 'array' AND jsonb_array_length(v_emb_json) = 768 THEN
    v_embedding := v_emb_json::text::vector(768);
  ELSE
    v_embedding := NULL;
  END IF;

  v_media := COALESCE(payload->'asset'->'media', '[]'::jsonb);

  INSERT INTO public.salsabil_assets (name, description, asset_type, traits, media, created_by, semantic_embedding)
  VALUES (
    COALESCE(NULLIF(payload->'asset'->>'name',''), 'Untitled Asset'),
    payload->'asset'->>'description',
    v_asset_type,
    COALESCE(payload->'asset'->'traits', '{}'::jsonb),
    v_media,
    v_caller,
    v_embedding
  )
  RETURNING id INTO v_asset_id;

  v_pricing := COALESCE(NULLIF(payload->'financial_contract'->>'pricing_model',''),'flat')::public.salsabil_pricing_model;
  v_base_price := COALESCE((payload->'financial_contract'->>'base_price')::numeric, 0);
  v_currency   := COALESCE(NULLIF(payload->'financial_contract'->>'currency',''), 'EGP');
  v_contract_rules := COALESCE(payload->'financial_contract'->'contract_rules','{}'::jsonb);

  IF jsonb_typeof(payload->'skus') = 'array' AND jsonb_array_length(payload->'skus') > 0 THEN
    FOR v_sku IN SELECT * FROM jsonb_array_elements(payload->'skus')
    LOOP
      INSERT INTO public.salsabil_skus (asset_id, sku_code, attributes, sort_order)
      VALUES (
        v_asset_id,
        COALESCE(NULLIF(v_sku->>'sku_code',''), 'USA-' || substr(v_asset_id::text,1,8) || '-' || v_sort),
        COALESCE(v_sku->'attributes','{}'::jsonb),
        v_sort
      )
      RETURNING id INTO v_new_sku_id;

      INSERT INTO public.salsabil_financial_contracts (sku_id, pricing_model, base_price, currency, contract_rules)
      VALUES (v_new_sku_id, v_pricing, v_base_price, v_currency, v_contract_rules);

      v_sort := v_sort + 1;
    END LOOP;
  ELSE
    INSERT INTO public.salsabil_skus (asset_id, sku_code, attributes, sort_order)
    VALUES (v_asset_id, 'USA-' || substr(v_asset_id::text,1,8) || '-0', '{}'::jsonb, 0)
    RETURNING id INTO v_new_sku_id;

    INSERT INTO public.salsabil_financial_contracts (sku_id, pricing_model, base_price, currency, contract_rules)
    VALUES (v_new_sku_id, v_pricing, v_base_price, v_currency, v_contract_rules);
  END IF;

  RETURN v_asset_id;
END;
$function$;

-- 2) Drop the legacy products table. Cascade purges any dependent FKs / views.
DROP TABLE IF EXISTS public.products CASCADE;