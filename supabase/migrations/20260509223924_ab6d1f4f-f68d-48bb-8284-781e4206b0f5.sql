CREATE OR REPLACE FUNCTION public.process_tayseer_payment(p_order_id uuid, p_amount numeric)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid          uuid := auth.uid();
  v_wallet       public.wallets%ROWTYPE;
  v_treasury_id  uuid := '00000000-0000-0000-0000-000000000777';
  v_order        public.salsabil_master_orders%ROWTYPE;
  v_group        uuid := gen_random_uuid();
  v_idem         text;
  v_available    numeric(18,4);
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '28000';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'amount must be positive';
  END IF;

  SELECT * INTO v_order FROM public.salsabil_master_orders
   WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'order_not_found'; END IF;
  IF v_order.customer_id <> v_uid THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501'; END IF;
  IF v_order.payment_status = 'paid' THEN
    RETURN jsonb_build_object('ok', true, 'already_paid', true, 'order_id', p_order_id);
  END IF;

  SELECT * INTO v_wallet FROM public.wallets
   WHERE user_id = v_uid AND currency = 'EGP'
   FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'wallet_missing'; END IF;
  IF v_wallet.status <> 'active' THEN RAISE EXCEPTION 'wallet_inactive'; END IF;

  -- Phase 62: Sovereign Family OS — enforce spending caps before debit
  PERFORM public.check_wallet_limit(v_wallet.id, p_amount);

  v_available := v_wallet.balance + COALESCE(v_wallet.credit_limit, 0);
  IF v_available < p_amount THEN
    RAISE EXCEPTION 'insufficient_funds: available=% required=%', v_available, p_amount;
  END IF;

  v_idem := 'order:' || p_order_id::text;

  UPDATE public.wallets SET balance = balance - p_amount WHERE id = v_wallet.id;

  INSERT INTO public.ledger_entries
    (wallet_id, transaction_group_id, amount, currency, description, idempotency_key, counterparty_wallet_id)
  VALUES
    (v_wallet.id,    v_group, -p_amount, 'EGP', 'Tayseer payment for order ' || p_order_id::text, v_idem, v_treasury_id),
    (v_treasury_id,  v_group,  p_amount, 'EGP', 'Tayseer receipt for order ' || p_order_id::text, v_idem || ':t', v_wallet.id);

  UPDATE public.wallets SET balance = balance + p_amount WHERE id = v_treasury_id;

  UPDATE public.salsabil_master_orders
     SET payment_status = 'paid',
         paid_at = now(),
         status = CASE WHEN status='pending' THEN 'confirmed' ELSE status END
   WHERE id = p_order_id;

  RETURN jsonb_build_object(
    'ok', true,
    'order_id', p_order_id,
    'amount', p_amount,
    'transaction_group_id', v_group,
    'new_balance', v_wallet.balance - p_amount,
    'credit_used', GREATEST(0, p_amount - v_wallet.balance)
  );
END;
$function$;