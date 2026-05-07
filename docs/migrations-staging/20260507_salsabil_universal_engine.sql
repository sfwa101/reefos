-- ============================================================================
-- SALSABIL UNIVERSAL ASSET & CONTRACT ENGINE — Phase 7 (Part 1)
-- ----------------------------------------------------------------------------
-- God-Tier polymorphic schema. Lets Salsabil OS sell ANYTHING:
--   • Retail (physical, digital)
--   • Services & rentals (time-slot inventory)
--   • Real-estate finishing projects (milestone installments + escrow)
--   • Subscriptions (recurring contracts)
--
-- Philosophy:
--   asset      = WHAT it is (entity, traits, media)
--   sku        = exact unit of sale (variant attributes, barcode)
--   contract   = HOW money flows (pricing model + rules)
--   inventory  = WHAT'S available (count, time_slots, capacity)
--
-- This migration is STAGING ONLY. The legacy `products` table is untouched
-- so the live storefront keeps running. Cutover happens in Part 2.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. ENUMS
-- ----------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.salsabil_asset_type AS ENUM (
    'physical',
    'digital',
    'service',
    'rental',
    'milestone_project'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.salsabil_pricing_model AS ENUM (
    'flat',
    'tiered_wholesale',
    'subscription',
    'deposit_and_rental',
    'milestone_installments'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.salsabil_inventory_type AS ENUM (
    'count',
    'time_slots',
    'capacity'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ----------------------------------------------------------------------------
-- 2. salsabil_assets — the base polymorphic entity
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.salsabil_assets (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  description     text,
  category_path   text,                          -- e.g. "real-estate/finishing/kitchens"
  asset_type      public.salsabil_asset_type NOT NULL DEFAULT 'physical',
  traits          jsonb NOT NULL DEFAULT '{}'::jsonb,
                  -- e.g. {"requires_shipping":true,"requires_calendar":false,"requires_signature":true,"cold_chain":false}
  media           jsonb NOT NULL DEFAULT '[]'::jsonb,
                  -- gallery: [{"url":"...","kind":"image|video|3d","alt":"..."}]
  is_active       boolean NOT NULL DEFAULT true,
  created_by      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_salsabil_assets_type
  ON public.salsabil_assets(asset_type);
CREATE INDEX IF NOT EXISTS idx_salsabil_assets_category
  ON public.salsabil_assets(category_path);
CREATE INDEX IF NOT EXISTS idx_salsabil_assets_traits
  ON public.salsabil_assets USING GIN (traits);

-- ----------------------------------------------------------------------------
-- 3. salsabil_skus — the exact unit of sale
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.salsabil_skus (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id        uuid NOT NULL REFERENCES public.salsabil_assets(id) ON DELETE CASCADE,
  sku_code        text NOT NULL UNIQUE,
  barcode         text UNIQUE,
  attributes      jsonb NOT NULL DEFAULT '{}'::jsonb,
                  -- {"color":"red","size":"XL"} OR {"duration_days":3} OR {"floor":7,"unit":"B-204"}
  is_active       boolean NOT NULL DEFAULT true,
  sort_order      integer NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_salsabil_skus_asset
  ON public.salsabil_skus(asset_id);
CREATE INDEX IF NOT EXISTS idx_salsabil_skus_attributes
  ON public.salsabil_skus USING GIN (attributes);

-- ----------------------------------------------------------------------------
-- 4. salsabil_financial_contracts — the smart pricing primitive
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.salsabil_financial_contracts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku_id          uuid NOT NULL REFERENCES public.salsabil_skus(id) ON DELETE CASCADE,
  pricing_model   public.salsabil_pricing_model NOT NULL DEFAULT 'flat',
  base_price      numeric(14,2) NOT NULL DEFAULT 0,
  currency        text NOT NULL DEFAULT 'EGP',
  contract_rules  jsonb NOT NULL DEFAULT '{}'::jsonb,
                  -- tiered_wholesale:        {"tiers":[{"min_qty":1,"price":100},{"min_qty":12,"price":85}]}
                  -- subscription:            {"interval":"month","periods":12,"trial_days":7}
                  -- deposit_and_rental:      {"daily_rate":150,"deposit":2000,"refundable":true}
                  -- milestone_installments:  {"milestones":[{"label":"down","pct":20},{"label":"materials","pct":40},{"label":"handover","pct":40}]}
  is_active       boolean NOT NULL DEFAULT true,
  valid_from      timestamptz,
  valid_to        timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_salsabil_contracts_sku
  ON public.salsabil_financial_contracts(sku_id);
CREATE INDEX IF NOT EXISTS idx_salsabil_contracts_model
  ON public.salsabil_financial_contracts(pricing_model);

-- Validation trigger (immutable CHECK can't reference now()).
CREATE OR REPLACE FUNCTION public.salsabil_validate_contract()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.valid_to IS NOT NULL AND NEW.valid_from IS NOT NULL
     AND NEW.valid_to <= NEW.valid_from THEN
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

-- ----------------------------------------------------------------------------
-- 5. salsabil_inventory_matrix — multi-dimensional availability
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.salsabil_inventory_matrix (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku_id            uuid NOT NULL REFERENCES public.salsabil_skus(id) ON DELETE CASCADE,
  inventory_type    public.salsabil_inventory_type NOT NULL DEFAULT 'count',
  availability_data jsonb NOT NULL DEFAULT '{}'::jsonb,
                    -- count:      {"on_hand":42,"reserved":3,"reorder_at":10}
                    -- time_slots: {"slots":[{"start":"2026-05-10T10:00Z","end":"...","capacity":1,"booked":0}]}
                    -- capacity:   {"max":100,"booked":35}
  location_code     text,                   -- warehouse / branch / project_site
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_salsabil_inventory_sku
  ON public.salsabil_inventory_matrix(sku_id);
CREATE INDEX IF NOT EXISTS idx_salsabil_inventory_type
  ON public.salsabil_inventory_matrix(inventory_type);

-- ----------------------------------------------------------------------------
-- 6. updated_at triggers (reuse existing public.update_updated_at_column)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.salsabil_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_assets_touch       ON public.salsabil_assets;
DROP TRIGGER IF EXISTS trg_skus_touch         ON public.salsabil_skus;
DROP TRIGGER IF EXISTS trg_contracts_touch    ON public.salsabil_financial_contracts;
DROP TRIGGER IF EXISTS trg_inventory_touch    ON public.salsabil_inventory_matrix;

CREATE TRIGGER trg_assets_touch    BEFORE UPDATE ON public.salsabil_assets
  FOR EACH ROW EXECUTE FUNCTION public.salsabil_touch_updated_at();
CREATE TRIGGER trg_skus_touch      BEFORE UPDATE ON public.salsabil_skus
  FOR EACH ROW EXECUTE FUNCTION public.salsabil_touch_updated_at();
CREATE TRIGGER trg_contracts_touch BEFORE UPDATE ON public.salsabil_financial_contracts
  FOR EACH ROW EXECUTE FUNCTION public.salsabil_touch_updated_at();
CREATE TRIGGER trg_inventory_touch BEFORE UPDATE ON public.salsabil_inventory_matrix
  FOR EACH ROW EXECUTE FUNCTION public.salsabil_touch_updated_at();

-- ----------------------------------------------------------------------------
-- 7. RLS — public read (catalog browsing), admin-only write
-- ----------------------------------------------------------------------------
ALTER TABLE public.salsabil_assets               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salsabil_skus                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salsabil_financial_contracts  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salsabil_inventory_matrix     ENABLE ROW LEVEL SECURITY;

-- Public read on active rows (catalog).
CREATE POLICY "assets_public_read"   ON public.salsabil_assets
  FOR SELECT USING (is_active = true);
CREATE POLICY "skus_public_read"     ON public.salsabil_skus
  FOR SELECT USING (is_active = true);
CREATE POLICY "contracts_public_read" ON public.salsabil_financial_contracts
  FOR SELECT USING (is_active = true);
CREATE POLICY "inventory_public_read" ON public.salsabil_inventory_matrix
  FOR SELECT USING (true);

-- Admin write — relies on existing has_role(uid, 'admin') helper.
CREATE POLICY "assets_admin_write"    ON public.salsabil_assets
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "skus_admin_write"      ON public.salsabil_skus
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "contracts_admin_write" ON public.salsabil_financial_contracts
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "inventory_admin_write" ON public.salsabil_inventory_matrix
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================================================
-- END — Apply via supabase--migration in Part 2 after Emperor's review.
-- ============================================================================
