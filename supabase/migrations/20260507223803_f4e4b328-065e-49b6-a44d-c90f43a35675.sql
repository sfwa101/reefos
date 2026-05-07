-- ============================================================================
-- PHASE 7 PART 3 — Apply Universal Engine + Atomic Minting RPC
-- ============================================================================

-- 1. ENUMS
DO $$ BEGIN
  CREATE TYPE public.salsabil_asset_type AS ENUM ('physical','digital','service','rental','milestone_project');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.salsabil_pricing_model AS ENUM ('flat','tiered_wholesale','subscription','deposit_and_rental','milestone_installments');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.salsabil_inventory_type AS ENUM ('count','time_slots','capacity');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. salsabil_assets
CREATE TABLE IF NOT EXISTS public.salsabil_assets (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  description   text,
  category_path text,
  asset_type    public.salsabil_asset_type NOT NULL DEFAULT 'physical',
  traits        jsonb NOT NULL DEFAULT '{}'::jsonb,
  media         jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active     boolean NOT NULL DEFAULT true,
  created_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_salsabil_assets_type     ON public.salsabil_assets(asset_type);
CREATE INDEX IF NOT EXISTS idx_salsabil_assets_category ON public.salsabil_assets(category_path);
CREATE INDEX IF NOT EXISTS idx_salsabil_assets_traits   ON public.salsabil_assets USING GIN (traits);

-- 3. salsabil_skus
CREATE TABLE IF NOT EXISTS public.salsabil_skus (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id    uuid NOT NULL REFERENCES public.salsabil_assets(id) ON DELETE CASCADE,
  sku_code    text NOT NULL UNIQUE,
  barcode     text UNIQUE,
  attributes  jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active   boolean NOT NULL DEFAULT true,
  sort_order  integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_salsabil_skus_asset      ON public.salsabil_skus(asset_id);
CREATE INDEX IF NOT EXISTS idx_salsabil_skus_attributes ON public.salsabil_skus USING GIN (attributes);

-- 4. salsabil_financial_contracts
CREATE TABLE IF NOT EXISTS public.salsabil_financial_contracts (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku_id         uuid NOT NULL REFERENCES public.salsabil_skus(id) ON DELETE CASCADE,
  pricing_model  public.salsabil_pricing_model NOT NULL DEFAULT 'flat',
  base_price     numeric(14,2) NOT NULL DEFAULT 0,
  currency       text NOT NULL DEFAULT 'EGP',
  contract_rules jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active      boolean NOT NULL DEFAULT true,
  valid_from     timestamptz,
  valid_to       timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_salsabil_contracts_sku   ON public.salsabil_financial_contracts(sku_id);
CREATE INDEX IF NOT EXISTS idx_salsabil_contracts_model ON public.salsabil_financial_contracts(pricing_model);

CREATE OR REPLACE FUNCTION public.salsabil_validate_contract()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.valid_to IS NOT NULL AND NEW.valid_from IS NOT NULL AND NEW.valid_to <= NEW.valid_from THEN
    RAISE EXCEPTION 'salsabil_financial_contracts.valid_to must be after valid_from';
  END IF;
  IF NEW.base_price < 0 THEN
    RAISE EXCEPTION 'salsabil_financial_contracts.base_price must be non-negative';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_salsabil_validate_contract ON public.salsabil_financial_contracts;
CREATE TRIGGER trg_salsabil_validate_contract
  BEFORE INSERT OR UPDATE ON public.salsabil_financial_contracts
  FOR EACH ROW EXECUTE FUNCTION public.salsabil_validate_contract();

-- 5. salsabil_inventory_matrix
CREATE TABLE IF NOT EXISTS public.salsabil_inventory_matrix (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku_id            uuid NOT NULL REFERENCES public.salsabil_skus(id) ON DELETE CASCADE,
  inventory_type    public.salsabil_inventory_type NOT NULL DEFAULT 'count',
  availability_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  location_code     text,
  updated_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_salsabil_inventory_sku  ON public.salsabil_inventory_matrix(sku_id);
CREATE INDEX IF NOT EXISTS idx_salsabil_inventory_type ON public.salsabil_inventory_matrix(inventory_type);

-- 6. updated_at triggers
CREATE OR REPLACE FUNCTION public.salsabil_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_assets_touch    ON public.salsabil_assets;
DROP TRIGGER IF EXISTS trg_skus_touch      ON public.salsabil_skus;
DROP TRIGGER IF EXISTS trg_contracts_touch ON public.salsabil_financial_contracts;
DROP TRIGGER IF EXISTS trg_inventory_touch ON public.salsabil_inventory_matrix;

CREATE TRIGGER trg_assets_touch    BEFORE UPDATE ON public.salsabil_assets               FOR EACH ROW EXECUTE FUNCTION public.salsabil_touch_updated_at();
CREATE TRIGGER trg_skus_touch      BEFORE UPDATE ON public.salsabil_skus                 FOR EACH ROW EXECUTE FUNCTION public.salsabil_touch_updated_at();
CREATE TRIGGER trg_contracts_touch BEFORE UPDATE ON public.salsabil_financial_contracts  FOR EACH ROW EXECUTE FUNCTION public.salsabil_touch_updated_at();
CREATE TRIGGER trg_inventory_touch BEFORE UPDATE ON public.salsabil_inventory_matrix     FOR EACH ROW EXECUTE FUNCTION public.salsabil_touch_updated_at();

-- 7. RLS
ALTER TABLE public.salsabil_assets              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salsabil_skus                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salsabil_financial_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salsabil_inventory_matrix    ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "assets_public_read"     ON public.salsabil_assets;
DROP POLICY IF EXISTS "skus_public_read"       ON public.salsabil_skus;
DROP POLICY IF EXISTS "contracts_public_read"  ON public.salsabil_financial_contracts;
DROP POLICY IF EXISTS "inventory_public_read"  ON public.salsabil_inventory_matrix;
DROP POLICY IF EXISTS "assets_admin_write"     ON public.salsabil_assets;
DROP POLICY IF EXISTS "skus_admin_write"       ON public.salsabil_skus;
DROP POLICY IF EXISTS "contracts_admin_write"  ON public.salsabil_financial_contracts;
DROP POLICY IF EXISTS "inventory_admin_write"  ON public.salsabil_inventory_matrix;

CREATE POLICY "assets_public_read"    ON public.salsabil_assets              FOR SELECT USING (is_active = true);
CREATE POLICY "skus_public_read"      ON public.salsabil_skus                FOR SELECT USING (is_active = true);
CREATE POLICY "contracts_public_read" ON public.salsabil_financial_contracts FOR SELECT USING (is_active = true);
CREATE POLICY "inventory_public_read" ON public.salsabil_inventory_matrix    FOR SELECT USING (true);

CREATE POLICY "assets_admin_write"    ON public.salsabil_assets              FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "skus_admin_write"      ON public.salsabil_skus                FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "contracts_admin_write" ON public.salsabil_financial_contracts FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "inventory_admin_write" ON public.salsabil_inventory_matrix    FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============================================================================
-- 8. ATOMIC MINTING RPC — mint_universal_asset(payload jsonb) RETURNS uuid
--    Payload shape (USAGenesisPayload):
--      { asset:{name,description,asset_type,traits[]},
--        skus:[{sku_code,attributes}],
--        financial_contract:{pricing_model,base_price,currency,contract_rules} }
-- ============================================================================
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
BEGIN
  -- AuthZ: only admins may mint.
  IF v_caller IS NULL OR NOT public.has_role(v_caller, 'admin') THEN
    RAISE EXCEPTION 'unauthorized: admin role required to mint USA';
  END IF;

  IF payload IS NULL OR payload->'asset' IS NULL THEN
    RAISE EXCEPTION 'invalid payload: missing asset';
  END IF;

  v_asset_type := COALESCE(NULLIF(payload->'asset'->>'asset_type',''),'physical')::public.salsabil_asset_type;

  -- 1) Insert asset
  INSERT INTO public.salsabil_assets (name, description, asset_type, traits, created_by)
  VALUES (
    COALESCE(NULLIF(payload->'asset'->>'name',''), 'Untitled Asset'),
    payload->'asset'->>'description',
    v_asset_type,
    COALESCE(payload->'asset'->'traits', '{}'::jsonb),
    v_caller
  )
  RETURNING id INTO v_asset_id;

  -- 2) Insert SKUs
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
      IF v_sort = 0 THEN
        -- keep first sku id/attrs (RETURNING already populated on first iteration)
        NULL;
      END IF;
      v_sort := v_sort + 1;
    END LOOP;
  ELSE
    -- Default singleton SKU
    INSERT INTO public.salsabil_skus (asset_id, sku_code, attributes, sort_order)
    VALUES (v_asset_id, 'USA-' || substr(v_asset_id::text,1,8) || '-0', '{}'::jsonb, 0)
    RETURNING id, attributes INTO v_first_sku_id, v_first_sku_attrs;
  END IF;

  -- Re-fetch the FIRST sku (the loop variable above gets overwritten each iteration)
  SELECT id, attributes INTO v_first_sku_id, v_first_sku_attrs
  FROM public.salsabil_skus
  WHERE asset_id = v_asset_id
  ORDER BY sort_order ASC
  LIMIT 1;

  -- 3) Insert financial contract on the first SKU
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

  -- 4) Legacy shim: mirror physical assets into the live `products` table for zero-downtime.
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