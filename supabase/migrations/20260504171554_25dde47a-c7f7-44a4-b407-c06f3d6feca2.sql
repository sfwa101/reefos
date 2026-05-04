
-- =========================================================================
-- 1. KYC Tiers & Limits
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.kyc_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  level smallint NOT NULL UNIQUE CHECK (level >= 0 AND level <= 3),
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.kyc_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_id uuid NOT NULL REFERENCES public.kyc_tiers(id) ON DELETE CASCADE UNIQUE,
  daily_transfer_limit numeric(12,2) NOT NULL DEFAULT 0,
  monthly_transfer_limit numeric(12,2) NOT NULL DEFAULT 0,
  max_balance numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.kyc_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kyc_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "kyc_tiers public read" ON public.kyc_tiers FOR SELECT USING (true);
CREATE POLICY "kyc_limits public read" ON public.kyc_limits FOR SELECT USING (true);
CREATE POLICY "kyc_tiers admin write" ON public.kyc_tiers FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "kyc_limits admin write" ON public.kyc_limits FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Seed default tiers (idempotent)
INSERT INTO public.kyc_tiers (name, level, description) VALUES
  ('unverified', 0, 'لم يتم التوثيق - حدود دنيا'),
  ('id_verified', 1, 'توثيق هوية - حدود متوسطة'),
  ('address_verified', 2, 'توثيق هوية وعنوان - حدود مرتفعة'),
  ('premium', 3, 'حساب موثق متقدم - حدود قصوى')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.kyc_limits (tier_id, daily_transfer_limit, monthly_transfer_limit, max_balance)
SELECT t.id,
  CASE t.level WHEN 0 THEN 0 WHEN 1 THEN 5000 WHEN 2 THEN 25000 WHEN 3 THEN 100000 END,
  CASE t.level WHEN 0 THEN 0 WHEN 1 THEN 50000 WHEN 2 THEN 250000 WHEN 3 THEN 1000000 END,
  CASE t.level WHEN 0 THEN 1000 WHEN 1 THEN 20000 WHEN 2 THEN 100000 WHEN 3 THEN 500000 END
FROM public.kyc_tiers t
ON CONFLICT (tier_id) DO NOTHING;

-- Helper: get caller's daily limit
CREATE OR REPLACE FUNCTION public.get_user_daily_transfer_limit(_user_id uuid DEFAULT auth.uid())
RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT COALESCE(l.daily_transfer_limit, 0)
  FROM public.kyc_tiers t
  LEFT JOIN public.kyc_limits l ON l.tier_id = t.id
  WHERE t.level = public.get_user_kyc_level(_user_id)
  LIMIT 1
$$;

-- =========================================================================
-- 2. Upgrade wallet_transfer_v2: dynamic limits from kyc_limits
-- =========================================================================
CREATE OR REPLACE FUNCTION public.wallet_transfer_v2(
  _idempotency_key uuid,
  _recipient_phone text,
  _amount numeric,
  _note text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_sender uuid := auth.uid();
  v_recipient uuid;
  v_first uuid;
  v_second uuid;
  v_existing jsonb;
  v_result jsonb;
  v_daily_limit numeric;
  v_used_today numeric;
BEGIN
  IF v_sender IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;
  IF _amount IS NULL OR _amount <= 0 THEN RAISE EXCEPTION 'invalid_amount'; END IF;

  SELECT result INTO v_existing FROM public.wallet_transfer_idempotency
   WHERE idempotency_key = _idempotency_key;
  IF v_existing IS NOT NULL THEN RETURN v_existing; END IF;

  -- Dynamic KYC daily limit (replaces hardcoded 5000)
  v_daily_limit := public.get_user_daily_transfer_limit(v_sender);
  IF v_daily_limit <= 0 THEN
    RAISE EXCEPTION 'kyc_required';
  END IF;

  SELECT COALESCE(SUM(ABS(amount)), 0) INTO v_used_today
    FROM public.wallet_transactions
   WHERE user_id = v_sender
     AND kind = 'transfer_out'
     AND created_at >= now() - interval '24 hours';

  IF v_used_today + _amount > v_daily_limit THEN
    RAISE EXCEPTION 'limit_exceeded';
  END IF;

  SELECT id INTO v_recipient FROM public.profiles WHERE phone = _recipient_phone LIMIT 1;
  IF v_recipient IS NULL THEN RAISE EXCEPTION 'recipient_not_found'; END IF;
  IF v_recipient = v_sender THEN RAISE EXCEPTION 'self_transfer'; END IF;

  IF v_sender < v_recipient THEN
    v_first := v_sender; v_second := v_recipient;
  ELSE
    v_first := v_recipient; v_second := v_sender;
  END IF;

  PERFORM 1 FROM public.wallet_balances WHERE user_id = v_first FOR UPDATE;
  PERFORM 1 FROM public.wallet_balances WHERE user_id = v_second FOR UPDATE;

  INSERT INTO public.wallet_balances (user_id, balance) VALUES (v_recipient, 0)
    ON CONFLICT (user_id) DO NOTHING;

  UPDATE public.wallet_balances SET balance = balance - _amount WHERE user_id = v_sender;
  IF NOT FOUND THEN RAISE EXCEPTION 'insufficient'; END IF;

  UPDATE public.wallet_balances SET balance = balance + _amount WHERE user_id = v_recipient;

  INSERT INTO public.wallet_transactions (user_id, amount, kind, label, source) VALUES
    (v_sender, -_amount, 'transfer_out', COALESCE(_note, 'تحويل'), 'p2p'),
    (v_recipient, _amount, 'transfer_in', COALESCE(_note, 'تحويل وارد'), 'p2p');

  v_result := jsonb_build_object('ok', true, 'amount', _amount, 'recipient', v_recipient);

  INSERT INTO public.wallet_transfer_idempotency
    (idempotency_key, sender_id, recipient_id, amount, result)
    VALUES (_idempotency_key, v_sender, v_recipient, _amount, v_result);

  RETURN v_result;
END;
$$;

-- =========================================================================
-- 3. Gam'eyas RPCs
-- =========================================================================
CREATE OR REPLACE FUNCTION public.create_gam_eya(
  _name text,
  _cycle_amount numeric,
  _max_members integer,
  _starts_at timestamptz DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_user uuid := auth.uid();
  v_id uuid;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;
  IF _cycle_amount <= 0 THEN RAISE EXCEPTION 'invalid_amount'; END IF;
  IF _max_members < 2 OR _max_members > 50 THEN RAISE EXCEPTION 'invalid_size'; END IF;

  INSERT INTO public.gam_eyas (name, cycle_amount, max_members, created_by, starts_at)
    VALUES (_name, _cycle_amount, _max_members, v_user, _starts_at)
    RETURNING id INTO v_id;

  INSERT INTO public.gam_eya_members (gam_eya_id, user_id, turn_number, is_trusted)
    VALUES (v_id, v_user, 1, true);

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.join_gam_eya(
  _gam_eya_id uuid,
  _turn_number integer,
  _guarantor_id uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_user uuid := auth.uid();
  v_max integer;
  v_taken integer;
  v_guarantor_trusted boolean;
  v_member_id uuid;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;

  -- Lock the circle row to prevent races on turn allocation
  SELECT max_members INTO v_max FROM public.gam_eyas WHERE id = _gam_eya_id FOR UPDATE;
  IF v_max IS NULL THEN RAISE EXCEPTION 'gam_eya_not_found'; END IF;

  IF _turn_number < 1 OR _turn_number > v_max THEN
    RAISE EXCEPTION 'invalid_turn';
  END IF;

  -- Reject duplicate turn or duplicate user
  SELECT COUNT(*) INTO v_taken FROM public.gam_eya_members
    WHERE gam_eya_id = _gam_eya_id
      AND (turn_number = _turn_number OR user_id = v_user);
  IF v_taken > 0 THEN RAISE EXCEPTION 'turn_or_user_taken'; END IF;

  -- Validate guarantor if provided
  IF _guarantor_id IS NOT NULL THEN
    SELECT is_trusted INTO v_guarantor_trusted
      FROM public.gam_eya_members
      WHERE gam_eya_id = _gam_eya_id AND user_id = _guarantor_id
      LIMIT 1;
    IF v_guarantor_trusted IS NOT TRUE THEN
      RAISE EXCEPTION 'guarantor_not_trusted';
    END IF;
  END IF;

  INSERT INTO public.gam_eya_members (gam_eya_id, user_id, turn_number, guarantor_id, is_trusted)
    VALUES (_gam_eya_id, v_user, _turn_number, _guarantor_id, _guarantor_id IS NOT NULL)
    RETURNING id INTO v_member_id;

  RETURN v_member_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.pay_gam_eya_installment(
  _installment_id uuid
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_user uuid := auth.uid();
  v_amount numeric;
  v_owner uuid;
  v_status gam_eya_installment_status;
  v_circle uuid;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;

  SELECT user_id, amount_due, status, gam_eya_id
    INTO v_owner, v_amount, v_status, v_circle
    FROM public.gam_eya_installments
    WHERE id = _installment_id FOR UPDATE;

  IF v_owner IS NULL THEN RAISE EXCEPTION 'installment_not_found'; END IF;
  IF v_owner <> v_user THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF v_status = 'paid' THEN RAISE EXCEPTION 'already_paid'; END IF;

  -- Lock wallet and atomically debit (CHECK ensures >= 0)
  PERFORM 1 FROM public.wallet_balances WHERE user_id = v_user FOR UPDATE;
  UPDATE public.wallet_balances
    SET balance = balance - v_amount
    WHERE user_id = v_user;
  IF NOT FOUND THEN RAISE EXCEPTION 'wallet_missing'; END IF;

  UPDATE public.gam_eya_installments
    SET status = 'paid', amount_paid = v_amount, paid_at = now()
    WHERE id = _installment_id;

  INSERT INTO public.wallet_transactions (user_id, amount, kind, label, source)
    VALUES (v_user, -v_amount, 'gam_eya_deposit', 'قسط جمعية', 'gam_eya');

  RETURN jsonb_build_object('ok', true, 'amount', v_amount, 'gam_eya_id', v_circle);
END;
$$;

-- =========================================================================
-- 4. Scheduled transfers
-- =========================================================================
DO $$ BEGIN
  CREATE TYPE public.scheduled_transfer_frequency AS ENUM ('weekly','monthly');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.scheduled_transfer_purpose AS ENUM ('gam_eya','savings','p2p','vault');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.scheduled_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  frequency public.scheduled_transfer_frequency NOT NULL,
  next_run_at timestamptz NOT NULL,
  purpose public.scheduled_transfer_purpose NOT NULL DEFAULT 'p2p',
  reference_id uuid,
  is_active boolean NOT NULL DEFAULT true,
  last_run_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sched_user ON public.scheduled_transfers(user_id);
CREATE INDEX IF NOT EXISTS idx_sched_next_run ON public.scheduled_transfers(next_run_at) WHERE is_active;

ALTER TABLE public.scheduled_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sched read own" ON public.scheduled_transfers FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "sched insert own" ON public.scheduled_transfers FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "sched update own" ON public.scheduled_transfers FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "sched delete own" ON public.scheduled_transfers FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE TRIGGER trg_sched_updated BEFORE UPDATE ON public.scheduled_transfers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================================
-- 5. Payment methods
-- =========================================================================
DO $$ BEGIN
  CREATE TYPE public.payment_method_kind AS ENUM ('card','wallet','bank','vodafone_cash','instapay');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind public.payment_method_kind NOT NULL,
  brand text,
  last4 text CHECK (last4 IS NULL OR length(last4) <= 4),
  label text,
  is_default boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pm_user ON public.payment_methods(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_pm_one_default
  ON public.payment_methods(user_id) WHERE is_default;

ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pm read own" ON public.payment_methods FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "pm insert own" ON public.payment_methods FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "pm update own" ON public.payment_methods FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "pm delete own" ON public.payment_methods FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE TRIGGER trg_pm_updated BEFORE UPDATE ON public.payment_methods
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
