
-- ========== 1. wallet_assets ==========
CREATE TABLE IF NOT EXISTS public.wallet_assets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  asset_type TEXT NOT NULL,
  balance NUMERIC NOT NULL DEFAULT 0,
  currency_code TEXT NOT NULL DEFAULT 'EGP',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, asset_type)
);
ALTER TABLE public.wallet_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wa_select_own" ON public.wallet_assets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "wa_insert_own" ON public.wallet_assets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "wa_update_own" ON public.wallet_assets FOR UPDATE USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_assets_user ON public.wallet_assets(user_id);

-- ========== 2. asset_transfers ==========
CREATE TABLE IF NOT EXISTS public.asset_transfers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  from_asset TEXT NOT NULL,
  to_asset TEXT NOT NULL,
  from_amount NUMERIC NOT NULL,
  to_amount NUMERIC NOT NULL,
  rate NUMERIC,
  reason TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.asset_transfers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "at_select_own" ON public.asset_transfers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "at_insert_own" ON public.asset_transfers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_asset_transfers_user ON public.asset_transfers(user_id);

-- ========== 3. gold_price_snapshots ==========
CREATE TABLE IF NOT EXISTS public.gold_price_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  price_egp_per_gram NUMERIC NOT NULL,
  source TEXT NOT NULL DEFAULT 'manual',
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.gold_price_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gps_select_authed" ON public.gold_price_snapshots FOR SELECT TO authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_gold_snapshots_captured ON public.gold_price_snapshots(captured_at DESC);

-- ========== 4. user_trust_score (CREATE) ==========
CREATE TABLE IF NOT EXISTS public.user_trust_score (
  user_id UUID NOT NULL PRIMARY KEY,
  score NUMERIC NOT NULL DEFAULT 0,
  tier INT NOT NULL DEFAULT 1,
  is_trusted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.user_trust_score ENABLE ROW LEVEL SECURITY;
CREATE POLICY "uts_select_own" ON public.user_trust_score FOR SELECT USING (auth.uid() = user_id);

-- ========== 5. gam_eyas extensions ==========
ALTER TABLE public.gam_eyas
  ADD COLUMN IF NOT EXISTS cycle_duration_months INT,
  ADD COLUMN IF NOT EXISTS payout_frequency TEXT DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS min_kyc_tier INT DEFAULT 1,
  ADD COLUMN IF NOT EXISTS max_amount_for_tier NUMERIC,
  ADD COLUMN IF NOT EXISTS e_contract_url TEXT,
  ADD COLUMN IF NOT EXISTS late_grace_days INT NOT NULL DEFAULT 7,
  ADD COLUMN IF NOT EXISTS reward_pool NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_by_role TEXT;

-- ========== 6. gam_eya_members extensions ==========
ALTER TABLE public.gam_eya_members
  ADD COLUMN IF NOT EXISTS e_signature_blob TEXT,
  ADD COLUMN IF NOT EXISTS kyc_tier_at_join INT,
  ADD COLUMN IF NOT EXISTS guarantor_signed_at TIMESTAMPTZ;

-- ========== 7. gam_eya_installments extensions ==========
ALTER TABLE public.gam_eya_installments
  ADD COLUMN IF NOT EXISTS grace_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS covered_by_guarantor BOOLEAN NOT NULL DEFAULT FALSE;

-- ========== 8. profiles.hide_balance ==========
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS hide_balance BOOLEAN NOT NULL DEFAULT FALSE;

-- ========== 9. trigger ==========
CREATE OR REPLACE FUNCTION public.touch_wallet_assets_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_wallet_assets_touch ON public.wallet_assets;
CREATE TRIGGER trg_wallet_assets_touch
BEFORE UPDATE ON public.wallet_assets
FOR EACH ROW EXECUTE FUNCTION public.touch_wallet_assets_updated_at();
