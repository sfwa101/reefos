-- ============================================================
-- PHASE N — VIRAL GROWTH & AUTONOMOUS WORKFORCE ENGINE
-- ============================================================

-- ACTION 1: REFERRAL TREE & IDENTITY MASKING ------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referral_code varchar(6) UNIQUE;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referred_by uuid REFERENCES public.profiles(id);

CREATE OR REPLACE FUNCTION public.generate_unique_referral_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code varchar(6);
  v_alphabet text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  v_exists boolean;
  v_attempt int := 0;
BEGIN
  IF NEW.referral_code IS NOT NULL AND length(NEW.referral_code) = 6 THEN
    RETURN NEW;
  END IF;

  LOOP
    v_attempt := v_attempt + 1;
    v_code := '';
    FOR i IN 1..6 LOOP
      v_code := v_code || substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::int, 1);
    END LOOP;

    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE referral_code = v_code) INTO v_exists;
    EXIT WHEN NOT v_exists OR v_attempt > 25;
  END LOOP;

  NEW.referral_code := v_code;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_generate_referral_code ON public.profiles;
CREATE TRIGGER trg_profiles_generate_referral_code
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_unique_referral_code();

-- Backfill existing profiles missing a referral code
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM public.profiles WHERE referral_code IS NULL LOOP
    UPDATE public.profiles SET referral_code = NULL WHERE id = r.id; -- noop to satisfy IDE
    -- Re-trigger via update with synthetic insert path
    PERFORM 1;
  END LOOP;
END $$;

-- Direct backfill loop (works without trigger reuse)
DO $$
DECLARE
  r record;
  v_code varchar(6);
  v_alphabet text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  v_exists boolean;
BEGIN
  FOR r IN SELECT id FROM public.profiles WHERE referral_code IS NULL LOOP
    LOOP
      v_code := '';
      FOR i IN 1..6 LOOP
        v_code := v_code || substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::int, 1);
      END LOOP;
      SELECT EXISTS(SELECT 1 FROM public.profiles WHERE referral_code = v_code) INTO v_exists;
      EXIT WHEN NOT v_exists;
    END LOOP;
    UPDATE public.profiles SET referral_code = v_code WHERE id = r.id;
  END LOOP;
END $$;

-- ACTION 2: DYNAMIC TIER SYSTEM -------------------------------
CREATE TABLE IF NOT EXISTS public.partner_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  b2c_first_order_pct numeric(5,2) NOT NULL DEFAULT 0,
  b2c_recurring_pct numeric(5,2) NOT NULL DEFAULT 0,
  duration_months int NOT NULL DEFAULT 12,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.partner_tiers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Partner tiers are public read" ON public.partner_tiers;
CREATE POLICY "Partner tiers are public read"
  ON public.partner_tiers FOR SELECT
  USING (true);

INSERT INTO public.partner_tiers (name, b2c_first_order_pct, b2c_recurring_pct, duration_months)
VALUES
  ('Bronze', 5.00, 1.00, 12),
  ('Silver', 8.00, 2.00, 12),
  ('Commissioner', 15.00, 5.00, 24)
ON CONFLICT (name) DO NOTHING;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS partner_tier_id uuid REFERENCES public.partner_tiers(id);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_b2b_commissioner boolean NOT NULL DEFAULT false;

-- ACTION 3: B2B COMMISSIONER LINKING --------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='vendors') THEN
    EXECUTE 'ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS account_manager_id uuid REFERENCES public.profiles(id)';
  ELSIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='vendor_inventory') THEN
    EXECUTE 'ALTER TABLE public.vendor_inventory ADD COLUMN IF NOT EXISTS account_manager_id uuid REFERENCES public.profiles(id)';
  END IF;
END $$;

-- ACTION 4: THE 3-WAY SETTLEMENT ------------------------------
CREATE OR REPLACE FUNCTION public.distribute_affiliate_commission(
  p_order_id uuid,
  p_total_platform_fee numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_buyer_id uuid;
  v_vendor_id uuid;
  v_referrer_id uuid;
  v_referrer_tier public.partner_tiers%ROWTYPE;
  v_account_manager_id uuid;
  v_manager_tier public.partner_tiers%ROWTYPE;
  v_is_first_order boolean := false;
  v_is_b2b boolean := false;
  v_affiliate_cut numeric := 0;
  v_manager_cut numeric := 0;
  v_platform_wallet uuid;
  v_affiliate_wallet uuid;
  v_manager_wallet uuid;
  v_txn uuid := gen_random_uuid();
  v_order_total numeric := 0;
BEGIN
  IF p_total_platform_fee IS NULL OR p_total_platform_fee <= 0 THEN
    RETURN;
  END IF;

  -- Resolve buyer + vendor + b2b flag from orders (defensive against schema variance)
  EXECUTE format($f$
    SELECT
      (to_jsonb(o)->>'user_id')::uuid,
      (to_jsonb(o)->>'vendor_id')::uuid,
      COALESCE((to_jsonb(o)->>'is_b2b')::boolean, false),
      COALESCE((to_jsonb(o)->>'total')::numeric, 0)
    FROM public.orders o WHERE o.id = %L
  $f$, p_order_id)
  INTO v_buyer_id, v_vendor_id, v_is_b2b, v_order_total;

  IF v_buyer_id IS NULL THEN
    RETURN;
  END IF;

  -- Resolve referrer
  SELECT referred_by INTO v_referrer_id FROM public.profiles WHERE id = v_buyer_id;

  -- Detect first order
  IF v_referrer_id IS NOT NULL THEN
    SELECT (COUNT(*) <= 1) INTO v_is_first_order
    FROM public.orders WHERE (to_jsonb(orders)->>'user_id')::uuid = v_buyer_id;

    SELECT pt.* INTO v_referrer_tier
    FROM public.profiles p
    JOIN public.partner_tiers pt ON pt.id = p.partner_tier_id
    WHERE p.id = v_referrer_id;

    IF FOUND THEN
      v_affiliate_cut := round(
        p_total_platform_fee *
        (CASE WHEN v_is_first_order THEN v_referrer_tier.b2c_first_order_pct
              ELSE v_referrer_tier.b2c_recurring_pct END) / 100.0, 2);
    END IF;
  END IF;

  -- B2B account manager cut
  IF v_is_b2b AND v_vendor_id IS NOT NULL THEN
    BEGIN
      EXECUTE format('SELECT account_manager_id FROM public.vendors WHERE id = %L', v_vendor_id)
        INTO v_account_manager_id;
    EXCEPTION WHEN undefined_table OR undefined_column THEN
      v_account_manager_id := NULL;
    END;

    IF v_account_manager_id IS NOT NULL THEN
      SELECT pt.* INTO v_manager_tier
      FROM public.profiles p
      JOIN public.partner_tiers pt ON pt.id = p.partner_tier_id
      WHERE p.id = v_account_manager_id;

      IF FOUND THEN
        v_manager_cut := round(p_total_platform_fee * v_manager_tier.b2c_recurring_pct / 100.0, 2);
      END IF;
    END IF;
  END IF;

  -- Resolve wallets via existing helper if present
  BEGIN
    v_platform_wallet := public._resolve_wallet(NULL, 'PLATFORM');
  EXCEPTION WHEN undefined_function THEN
    SELECT id INTO v_platform_wallet FROM public.wallets WHERE wallet_type = 'PLATFORM' LIMIT 1;
  END;

  -- Affiliate ledger pair
  IF v_affiliate_cut > 0 AND v_referrer_id IS NOT NULL AND v_platform_wallet IS NOT NULL THEN
    BEGIN
      v_affiliate_wallet := public._resolve_wallet(v_referrer_id, 'ACTIVE');
    EXCEPTION WHEN undefined_function THEN
      SELECT id INTO v_affiliate_wallet FROM public.wallets WHERE user_id = v_referrer_id LIMIT 1;
    END;

    IF v_affiliate_wallet IS NOT NULL THEN
      INSERT INTO public.ledger_entries (transaction_group_id, wallet_id, entry_type, amount, asset_type, memo)
      VALUES
        (v_txn, v_platform_wallet, 'DEBIT', v_affiliate_cut, 'FUNDS', 'Affiliate payout (order ' || p_order_id || ')'),
        (v_txn, v_affiliate_wallet, 'CREDIT', v_affiliate_cut, 'FUNDS', 'Affiliate commission earned');
    END IF;
  END IF;

  -- B2B manager ledger pair
  IF v_manager_cut > 0 AND v_account_manager_id IS NOT NULL AND v_platform_wallet IS NOT NULL THEN
    BEGIN
      v_manager_wallet := public._resolve_wallet(v_account_manager_id, 'ACTIVE');
    EXCEPTION WHEN undefined_function THEN
      SELECT id INTO v_manager_wallet FROM public.wallets WHERE user_id = v_account_manager_id LIMIT 1;
    END;

    IF v_manager_wallet IS NOT NULL THEN
      INSERT INTO public.ledger_entries (transaction_group_id, wallet_id, entry_type, amount, asset_type, memo)
      VALUES
        (v_txn, v_platform_wallet, 'DEBIT', v_manager_cut, 'FUNDS', 'B2B commissioner payout (order ' || p_order_id || ')'),
        (v_txn, v_manager_wallet, 'CREDIT', v_manager_cut, 'FUNDS', 'B2B commissioner earned');
    END IF;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.distribute_affiliate_commission(uuid, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.distribute_affiliate_commission(uuid, numeric) TO authenticated, service_role;