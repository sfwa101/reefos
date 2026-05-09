
-- =========================================================
-- Phase 57 — Success Partner Engine
-- =========================================================

-- 1) Helper: generate a unique 6-digit numeric code
CREATE OR REPLACE FUNCTION public._gen_unique_6digit_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _candidate text;
  _attempts int := 0;
BEGIN
  LOOP
    _candidate := lpad((100000 + floor(random() * 900000))::int::text, 6, '0');
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.profiles WHERE referral_code = _candidate
      UNION ALL
      SELECT 1 FROM public.referral_codes WHERE code = _candidate
    );
    _attempts := _attempts + 1;
    IF _attempts > 50 THEN
      RAISE EXCEPTION 'unable_to_generate_referral_code';
    END IF;
  END LOOP;
  RETURN _candidate;
END;
$$;

-- 2) Rewrite ensure_referral_code to produce strict 6-digit codes
CREATE OR REPLACE FUNCTION public.ensure_referral_code(_user_id uuid DEFAULT auth.uid())
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _existing text;
  _national text;
  _candidate text;
  _code text;
BEGIN
  IF _user_id IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;
  IF _user_id <> auth.uid() AND NOT is_staff(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT referral_code, national_id
    INTO _existing, _national
    FROM public.profiles
   WHERE id = _user_id;

  -- If we already have a strict 6-digit code, keep it.
  IF _existing IS NOT NULL AND _existing ~ '^[0-9]{6}$' THEN
    -- Mirror to referral_codes for fast reverse-lookup.
    INSERT INTO public.referral_codes (user_id, code)
    VALUES (_user_id, _existing)
    ON CONFLICT (user_id) DO UPDATE SET code = EXCLUDED.code;
    RETURN _existing;
  END IF;

  -- Prefer last-6 of National ID if available and unique.
  IF _national IS NOT NULL AND length(regexp_replace(_national, '\D', '', 'g')) >= 6 THEN
    _candidate := right(regexp_replace(_national, '\D', '', 'g'), 6);
    IF NOT EXISTS (
      SELECT 1 FROM public.profiles WHERE referral_code = _candidate AND id <> _user_id
    ) AND NOT EXISTS (
      SELECT 1 FROM public.referral_codes WHERE code = _candidate AND user_id <> _user_id
    ) THEN
      _code := _candidate;
    END IF;
  END IF;

  -- Otherwise generate random unique 6-digit.
  IF _code IS NULL THEN
    _code := public._gen_unique_6digit_code();
  END IF;

  UPDATE public.profiles SET referral_code = _code WHERE id = _user_id;

  INSERT INTO public.referral_codes (user_id, code)
  VALUES (_user_id, _code)
  ON CONFLICT (user_id) DO UPDATE SET code = EXCLUDED.code;

  -- Bootstrap affiliate state at lowest tier.
  INSERT INTO public.user_affiliate_state (user_id, current_tier_id, successful_invites)
  VALUES (
    _user_id,
    (SELECT id FROM public.affiliate_tiers ORDER BY rank ASC LIMIT 1),
    0
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN _code;
END;
$$;

-- 3) Backfill: migrate any non-6-digit referral codes to the new format.
DO $$
DECLARE r record;
DECLARE _new text;
BEGIN
  FOR r IN
    SELECT id, referral_code, national_id
      FROM public.profiles
     WHERE referral_code IS NOT NULL
       AND referral_code !~ '^[0-9]{6}$'
  LOOP
    IF r.national_id IS NOT NULL
       AND length(regexp_replace(r.national_id, '\D', '', 'g')) >= 6 THEN
      _new := right(regexp_replace(r.national_id, '\D', '', 'g'), 6);
      IF EXISTS (
        SELECT 1 FROM public.profiles WHERE referral_code = _new AND id <> r.id
      ) THEN
        _new := public._gen_unique_6digit_code();
      END IF;
    ELSE
      _new := public._gen_unique_6digit_code();
    END IF;
    UPDATE public.profiles SET referral_code = _new WHERE id = r.id;
    INSERT INTO public.referral_codes (user_id, code)
    VALUES (r.id, _new)
    ON CONFLICT (user_id) DO UPDATE SET code = EXCLUDED.code;
  END LOOP;
END $$;

-- 4) apply_referral_code: secure server-side referrer attachment.
CREATE OR REPLACE FUNCTION public.apply_referral_code(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _me uuid := auth.uid();
  _referrer uuid;
  _existing uuid;
BEGIN
  IF _me IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  IF p_code IS NULL OR p_code !~ '^[0-9]{6}$' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_code');
  END IF;

  SELECT user_id INTO _referrer
    FROM public.referral_codes
   WHERE code = p_code
   LIMIT 1;

  IF _referrer IS NULL THEN
    SELECT id INTO _referrer FROM public.profiles WHERE referral_code = p_code LIMIT 1;
  END IF;

  IF _referrer IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'unknown_code');
  END IF;

  IF _referrer = _me THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'self_referral');
  END IF;

  SELECT referred_by INTO _existing FROM public.profiles WHERE id = _me;
  IF _existing IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_referred');
  END IF;

  UPDATE public.profiles SET referred_by = _referrer WHERE id = _me;

  INSERT INTO public.referrals (referrer_id, referred_id, status, commission)
  VALUES (_referrer, _me, 'registered', 0)
  ON CONFLICT (referred_id) DO NOTHING;

  RETURN jsonb_build_object('ok', true, 'referrer_id', _referrer);
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_referral_code(text) TO authenticated;

-- 5) pay_commission_from_treasury: balanced double-entry payout.
CREATE OR REPLACE FUNCTION public.pay_commission_from_treasury(p_commission_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _treasury_wallet uuid := '00000000-0000-0000-0000-000000000777';
  _row record;
  _affiliate_wallet uuid;
  _group uuid := gen_random_uuid();
  _idem text;
BEGIN
  IF auth.uid() IS NULL OR NOT is_staff(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT * INTO _row
    FROM public.commission_ledger
   WHERE id = p_commission_id
   FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'commission_not_found'; END IF;
  IF _row.status = 'paid' THEN
    RETURN jsonb_build_object('ok', true, 'already_paid', true);
  END IF;
  IF _row.status NOT IN ('payable', 'pending', 'vesting') THEN
    RAISE EXCEPTION 'invalid_status:%', _row.status;
  END IF;
  IF _row.commission_amount IS NULL OR _row.commission_amount <= 0 THEN
    RAISE EXCEPTION 'invalid_amount';
  END IF;

  SELECT id INTO _affiliate_wallet
    FROM public.wallets
   WHERE user_id = _row.affiliate_user_id
     AND currency = 'EGP'
     AND status = 'active'
   ORDER BY created_at ASC
   LIMIT 1;

  IF _affiliate_wallet IS NULL THEN
    RAISE EXCEPTION 'affiliate_wallet_missing';
  END IF;

  _idem := 'commission:' || p_commission_id::text;

  -- Debit Treasury, Credit Affiliate (balanced double-entry).
  INSERT INTO public.ledger_entries (
    wallet_id, transaction_group_id, amount, currency,
    description, idempotency_key, counterparty_wallet_id
  ) VALUES (
    _treasury_wallet, _group, -_row.commission_amount, 'EGP',
    'commission_payout:' || p_commission_id::text,
    _idem || ':debit', _affiliate_wallet
  );

  INSERT INTO public.ledger_entries (
    wallet_id, transaction_group_id, amount, currency,
    description, idempotency_key, counterparty_wallet_id
  ) VALUES (
    _affiliate_wallet, _group, _row.commission_amount, 'EGP',
    'commission_payout:' || p_commission_id::text,
    _idem || ':credit', _treasury_wallet
  );

  -- Refresh wallet balances.
  UPDATE public.wallets
     SET balance = COALESCE(balance, 0) - _row.commission_amount,
         updated_at = now()
   WHERE id = _treasury_wallet;
  UPDATE public.wallets
     SET balance = COALESCE(balance, 0) + _row.commission_amount,
         updated_at = now()
   WHERE id = _affiliate_wallet;

  UPDATE public.commission_ledger
     SET status = 'paid',
         paid_at = now()
   WHERE id = p_commission_id;

  RETURN jsonb_build_object(
    'ok', true,
    'transaction_group_id', _group,
    'amount', _row.commission_amount,
    'affiliate_wallet_id', _affiliate_wallet
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.pay_commission_from_treasury(uuid) TO authenticated;
