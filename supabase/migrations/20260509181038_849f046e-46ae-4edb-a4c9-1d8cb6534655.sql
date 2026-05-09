-- Phase 53: Sovereign POS — Cash Drawer wallet + atomic cash settlement RPC

INSERT INTO public.wallets (id, user_id, balance, currency, status)
VALUES (
  '00000000-0000-0000-0000-000000000888',
  '00000000-0000-0000-0000-000000000888',
  0,
  'EGP',
  'active'
)
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.process_pos_cash_payment(
  p_order_id uuid,
  p_amount   numeric
) RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
DECLARE
  v_uid          uuid := auth.uid();
  v_order        public.salsabil_master_orders%ROWTYPE;
  v_treasury_id  uuid := '00000000-0000-0000-0000-000000000777';
  v_cash_id      uuid := '00000000-0000-0000-0000-000000000888';
  v_group        uuid := gen_random_uuid();
  v_idem         text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '28000';
  END IF;

  IF NOT (
       public.has_role(v_uid, 'cashier'::public.app_role)
    OR public.has_role(v_uid, 'branch_manager'::public.app_role)
    OR public.has_role(v_uid, 'admin'::public.app_role)
  ) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'amount_must_be_positive';
  END IF;

  SELECT * INTO v_order FROM public.salsabil_master_orders
   WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'order_not_found'; END IF;

  IF v_order.payment_status = 'paid' THEN
    RETURN jsonb_build_object('ok', true, 'already_paid', true, 'order_id', p_order_id);
  END IF;

  v_idem := 'pos_cash:' || p_order_id::text;

  INSERT INTO public.ledger_entries
    (wallet_id, transaction_group_id, amount, currency, description, idempotency_key, counterparty_wallet_id)
  VALUES
    (v_cash_id,     v_group,  p_amount, 'EGP', 'POS cash receipt for order ' || p_order_id::text, v_idem,         v_treasury_id),
    (v_treasury_id, v_group, -p_amount, 'EGP', 'POS cash sale for order '    || p_order_id::text, v_idem || ':t', v_cash_id);

  UPDATE public.wallets SET balance = balance + p_amount WHERE id = v_cash_id;
  UPDATE public.wallets SET balance = balance - p_amount WHERE id = v_treasury_id;

  UPDATE public.salsabil_master_orders
     SET payment_status = 'paid',
         paid_at        = now(),
         status         = CASE WHEN status = 'pending' THEN 'confirmed' ELSE status END
   WHERE id = p_order_id;

  RETURN jsonb_build_object(
    'ok', true,
    'order_id', p_order_id,
    'amount', p_amount,
    'transaction_group_id', v_group,
    'channel', 'pos_cash'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.process_pos_cash_payment(uuid, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_pos_cash_payment(uuid, numeric) TO authenticated;

COMMENT ON FUNCTION public.process_pos_cash_payment(uuid, numeric) IS
  'Phase 53 — Sovereign POS cash settlement. Atomically marks a master order paid and posts a balanced ledger pair (Cash Drawer / Treasury). Caller must be cashier, branch_manager, or admin.';