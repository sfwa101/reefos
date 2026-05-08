
-- ============================================================
-- Phase 8 Patch — G1: Inventory → Legacy products.stock sync
-- ============================================================
CREATE OR REPLACE FUNCTION public.sync_inventory_to_legacy()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sku_id   uuid;
  v_asset_id uuid;
  v_total    int;
  v_legacy   text;
BEGIN
  v_sku_id := COALESCE(NEW.sku_id, OLD.sku_id);
  IF v_sku_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT asset_id INTO v_asset_id FROM public.salsabil_skus WHERE id = v_sku_id;
  IF v_asset_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT COALESCE(SUM(NULLIF(im.availability_data->>'count','')::int), 0)
    INTO v_total
  FROM public.salsabil_inventory_matrix im
  JOIN public.salsabil_skus s ON s.id = im.sku_id
  WHERE s.asset_id = v_asset_id
    AND im.inventory_type = 'count';

  v_legacy := 'usa_' || replace(v_asset_id::text, '-', '');
  UPDATE public.products SET stock = v_total WHERE id = v_legacy;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_inventory_to_legacy ON public.salsabil_inventory_matrix;
CREATE TRIGGER trg_sync_inventory_to_legacy
AFTER INSERT OR UPDATE OR DELETE ON public.salsabil_inventory_matrix
FOR EACH ROW EXECUTE FUNCTION public.sync_inventory_to_legacy();

-- ============================================================
-- Phase 8 Patch — G4 + G14: Mint fans out contracts per SKU,
-- persists media, mirrors first image to legacy products.image
-- ============================================================
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
  v_new_sku_id   uuid;
  v_sort         int := 0;
  v_asset_type   public.salsabil_asset_type;
  v_pricing      public.salsabil_pricing_model;
  v_base_price   numeric;
  v_currency     text;
  v_contract_rules jsonb;
  v_legacy_id    text;
  v_unit_label   text;
  v_embedding    vector(768);
  v_emb_json     jsonb;
  v_media        jsonb;
  v_first_image  text;
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
  IF jsonb_typeof(v_media) = 'array' AND jsonb_array_length(v_media) > 0 THEN
    v_first_image := v_media->>0;
  ELSE
    v_first_image := NULL;
  END IF;

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

      -- G4: every SKU receives the base financial contract
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

  SELECT id, attributes INTO v_first_sku_id, v_first_sku_attrs
  FROM public.salsabil_skus
  WHERE asset_id = v_asset_id
  ORDER BY sort_order ASC
  LIMIT 1;

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
      v_first_image,
      'usa-genesis',
      'supermarket',
      0,
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
