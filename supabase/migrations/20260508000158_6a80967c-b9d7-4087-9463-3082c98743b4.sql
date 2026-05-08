-- Phase 8 Part 4 — Persist semantic embedding inside mint_universal_asset
CREATE OR REPLACE FUNCTION public.mint_universal_asset(payload jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller       uuid := auth.uid();
  v_asset_id     uuid;
  v_first_sku_id uuid;
  v_first_sku_attrs jsonb;
  v_sku          jsonb;
  v_sort         int := 0;
  v_asset_type   public.salsabil_asset_type;
  v_base_price   numeric;
  v_currency     text;
  v_legacy_id    text;
  v_unit_label   text;
  v_embedding    vector(768);
  v_emb_json     jsonb;
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

  INSERT INTO public.salsabil_assets (name, description, asset_type, traits, created_by, semantic_embedding)
  VALUES (
    COALESCE(NULLIF(payload->'asset'->>'name',''), 'Untitled Asset'),
    payload->'asset'->>'description',
    v_asset_type,
    COALESCE(payload->'asset'->'traits', '{}'::jsonb),
    v_caller,
    v_embedding
  )
  RETURNING id INTO v_asset_id;

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
      RETURNING id, attributes INTO v_first_sku_id, v_first_sku_attrs;
      v_sort := v_sort + 1;
    END LOOP;
  ELSE
    INSERT INTO public.salsabil_skus (asset_id, sku_code, attributes, sort_order)
    VALUES (v_asset_id, 'USA-' || substr(v_asset_id::text,1,8) || '-0', '{}'::jsonb, 0)
    RETURNING id, attributes INTO v_first_sku_id, v_first_sku_attrs;
  END IF;

  SELECT id, attributes INTO v_first_sku_id, v_first_sku_attrs
  FROM public.salsabil_skus
  WHERE asset_id = v_asset_id
  ORDER BY sort_order ASC
  LIMIT 1;

  v_base_price := COALESCE((payload->'financial_contract'->>'base_price')::numeric, 0);
  v_currency   := COALESCE(NULLIF(payload->'financial_contract'->>'currency',''), 'EGP');

  INSERT INTO public.salsabil_financial_contracts (sku_id, pricing_model, base_price, currency, contract_rules)
  VALUES (
    v_first_sku_id,
    COALESCE(NULLIF(payload->'financial_contract'->>'pricing_model',''),'flat')::public.salsabil_pricing_model,
    v_base_price,
    v_currency,
    COALESCE(payload->'financial_contract'->'contract_rules','{}'::jsonb)
  );

  IF v_asset_type = 'physical' THEN
    v_legacy_id := 'usa_' || replace(v_asset_id::text, '-', '');
    v_unit_label := COALESCE(v_first_sku_attrs->>'unit', v_first_sku_attrs->>'size', 'وحدة');

    INSERT INTO public.products (
      id, name, unit, price, image, category, source, stock, is_active, description, metadata
    )
    VALUES (
      v_legacy_id,
      COALESCE(NULLIF(payload->'asset'->>'name',''),'Untitled'),
      v_unit_label,
      v_base_price,
      NULL,
      'usa-genesis',
      'supermarket',
      100,
      true,
      payload->'asset'->>'description',
      jsonb_build_object(
        'usa_asset_id', v_asset_id,
        'usa_sku_id',   v_first_sku_id,
        'minted_via',   'mint_universal_asset',
        'currency',     v_currency
      )
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN v_asset_id;
END;
$$;

REVOKE ALL ON FUNCTION public.mint_universal_asset(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mint_universal_asset(jsonb) TO authenticated;