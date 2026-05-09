
-- 1. Add payment_status to master orders
ALTER TABLE public.salsabil_master_orders
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'unpaid'
    CHECK (payment_status IN ('unpaid','paid','refunded')),
  ADD COLUMN IF NOT EXISTS paid_at timestamptz;

-- 2. Ensure a Tayseer treasury wallet exists (system-owned, NIL uuid)
INSERT INTO public.wallets (id, user_id, balance, currency, status)
VALUES (
  '00000000-0000-0000-0000-000000000777',
  '00000000-0000-0000-0000-000000000000',
  0, 'EGP', 'active'
)
ON CONFLICT (id) DO NOTHING;

-- 3. Atomic payment RPC
CREATE OR REPLACE FUNCTION public.process_tayseer_payment(
  p_order_id uuid,
  p_amount   numeric
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid          uuid := auth.uid();
  v_wallet       public.wallets%ROWTYPE;
  v_treasury_id  uuid := '00000000-0000-0000-0000-000000000777';
  v_order        public.salsabil_master_orders%ROWTYPE;
  v_group        uuid := gen_random_uuid();
  v_idem         text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '28000';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'amount must be positive';
  END IF;

  -- Lock order, ensure ownership + unpaid
  SELECT * INTO v_order FROM public.salsabil_master_orders
   WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'order_not_found'; END IF;
  IF v_order.customer_id <> v_uid THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501'; END IF;
  IF v_order.payment_status = 'paid' THEN
    RETURN jsonb_build_object('ok', true, 'already_paid', true, 'order_id', p_order_id);
  END IF;

  -- Lock user wallet
  SELECT * INTO v_wallet FROM public.wallets
   WHERE user_id = v_uid AND currency = 'EGP'
   FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'wallet_missing'; END IF;
  IF v_wallet.status <> 'active' THEN RAISE EXCEPTION 'wallet_inactive'; END IF;
  IF v_wallet.balance < p_amount THEN
    RAISE EXCEPTION 'insufficient_funds: balance=% required=%', v_wallet.balance, p_amount;
  END IF;

  v_idem := 'order:' || p_order_id::text;

  -- Debit user
  UPDATE public.wallets SET balance = balance - p_amount WHERE id = v_wallet.id;

  -- Double-entry: -X user, +X treasury (balanced check trigger requires sum=0)
  INSERT INTO public.ledger_entries
    (wallet_id, transaction_group_id, amount, currency, description, idempotency_key, counterparty_wallet_id)
  VALUES
    (v_wallet.id,    v_group, -p_amount, 'EGP', 'Tayseer payment for order ' || p_order_id::text, v_idem, v_treasury_id),
    (v_treasury_id,  v_group,  p_amount, 'EGP', 'Tayseer receipt for order ' || p_order_id::text, v_idem || ':t', v_wallet.id);

  -- Credit treasury balance
  UPDATE public.wallets SET balance = balance + p_amount WHERE id = v_treasury_id;

  -- Mark order paid
  UPDATE public.salsabil_master_orders
     SET payment_status = 'paid', paid_at = now(), status = CASE WHEN status='pending' THEN 'confirmed' ELSE status END
   WHERE id = p_order_id;

  RETURN jsonb_build_object(
    'ok', true,
    'order_id', p_order_id,
    'amount', p_amount,
    'transaction_group_id', v_group,
    'new_balance', v_wallet.balance - p_amount
  );
END;
$$;

REVOKE ALL ON FUNCTION public.process_tayseer_payment(uuid, numeric) FROM public;
GRANT EXECUTE ON FUNCTION public.process_tayseer_payment(uuid, numeric) TO authenticated;
