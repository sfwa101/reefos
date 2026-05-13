
-- ============================================================================
-- PHASE D-1: ECONOMIC PACKAGING RUNTIME
-- Recursive packaging-tier tree + inventory/contract pivots.
-- ============================================================================

-- 1. salsabil_packaging_tiers ------------------------------------------------
CREATE TABLE IF NOT EXISTS public.salsabil_packaging_tiers (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id              uuid NOT NULL REFERENCES public.salsabil_assets(id) ON DELETE CASCADE,
  parent_tier_id        uuid REFERENCES public.salsabil_packaging_tiers(id) ON DELETE CASCADE,
  tier_label            text NOT NULL,
  uom_code              text REFERENCES public.units_of_measure(code) ON DELETE SET NULL,
  conversion_to_parent  numeric(18,6) NOT NULL DEFAULT 1,
  conversion_to_base    numeric(18,6) NOT NULL DEFAULT 1,
  barcode               text UNIQUE,
  price_override        numeric(14,2),
  is_stock_keeping      boolean NOT NULL DEFAULT false,
  is_default_sell       boolean NOT NULL DEFAULT false,
  is_default_buy        boolean NOT NULL DEFAULT false,
  is_active             boolean NOT NULL DEFAULT true,
  sort_order            integer NOT NULL DEFAULT 0,
  attributes            jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pkg_tiers_asset   ON public.salsabil_packaging_tiers(asset_id);
CREATE INDEX IF NOT EXISTS idx_pkg_tiers_parent  ON public.salsabil_packaging_tiers(parent_tier_id);
CREATE INDEX IF NOT EXISTS idx_pkg_tiers_barcode ON public.salsabil_packaging_tiers(barcode);

-- 2. Validation trigger (cycles, positive conversions, single SKU tier) -----
CREATE OR REPLACE FUNCTION public.salsabil_validate_packaging_tier()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  cycle_check uuid;
  sk_count    int;
BEGIN
  IF NEW.conversion_to_parent <= 0 OR NEW.conversion_to_base <= 0 THEN
    RAISE EXCEPTION 'packaging_tier conversions must be > 0';
  END IF;

  IF NEW.parent_tier_id IS NOT NULL THEN
    -- self reference
    IF NEW.parent_tier_id = NEW.id THEN
      RAISE EXCEPTION 'packaging_tier cannot be its own parent';
    END IF;
    -- cycle detection up the tree
    WITH RECURSIVE up AS (
      SELECT id, parent_tier_id FROM public.salsabil_packaging_tiers WHERE id = NEW.parent_tier_id
      UNION ALL
      SELECT t.id, t.parent_tier_id
        FROM public.salsabil_packaging_tiers t
        JOIN up ON t.id = up.parent_tier_id
    )
    SELECT id INTO cycle_check FROM up WHERE id = NEW.id LIMIT 1;
    IF cycle_check IS NOT NULL THEN
      RAISE EXCEPTION 'packaging_tier hierarchy would create a cycle';
    END IF;
  END IF;

  -- only one stock-keeping tier per asset
  IF NEW.is_stock_keeping THEN
    SELECT count(*) INTO sk_count
      FROM public.salsabil_packaging_tiers
     WHERE asset_id = NEW.asset_id
       AND is_stock_keeping = true
       AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);
    IF sk_count > 0 THEN
      RAISE EXCEPTION 'asset % already has a stock-keeping packaging tier', NEW.asset_id;
    END IF;
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_validate_packaging_tier ON public.salsabil_packaging_tiers;
CREATE TRIGGER trg_validate_packaging_tier
  BEFORE INSERT OR UPDATE ON public.salsabil_packaging_tiers
  FOR EACH ROW EXECUTE FUNCTION public.salsabil_validate_packaging_tier();

-- updated_at touch
DROP TRIGGER IF EXISTS trg_pkg_tiers_touch ON public.salsabil_packaging_tiers;
CREATE TRIGGER trg_pkg_tiers_touch
  BEFORE UPDATE ON public.salsabil_packaging_tiers
  FOR EACH ROW EXECUTE FUNCTION public.salsabil_touch_updated_at();

-- 3. RLS ---------------------------------------------------------------------
ALTER TABLE public.salsabil_packaging_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pkg_tiers_public_read" ON public.salsabil_packaging_tiers
  FOR SELECT USING (is_active = true);

CREATE POLICY "pkg_tiers_admin_write" ON public.salsabil_packaging_tiers
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4. Pivot inventory + contracts onto packaging_tier_id ---------------------
ALTER TABLE public.salsabil_inventory_matrix
  ADD COLUMN IF NOT EXISTS packaging_tier_id uuid
  REFERENCES public.salsabil_packaging_tiers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_inventory_pkg_tier
  ON public.salsabil_inventory_matrix(packaging_tier_id);

ALTER TABLE public.salsabil_financial_contracts
  ADD COLUMN IF NOT EXISTS packaging_tier_id uuid
  REFERENCES public.salsabil_packaging_tiers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_contracts_pkg_tier
  ON public.salsabil_financial_contracts(packaging_tier_id);
