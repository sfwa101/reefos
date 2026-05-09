
-- =========================================================================
-- 1) Idempotency for savings ledger
-- =========================================================================
ALTER TABLE public.savings_transactions
  ADD COLUMN IF NOT EXISTS idempotency_key uuid;

CREATE UNIQUE INDEX IF NOT EXISTS savings_transactions_idem_uniq
  ON public.savings_transactions(user_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- =========================================================================
-- 2) Centralized authorization function for master orders
-- =========================================================================
CREATE OR REPLACE FUNCTION public.can_access_order(p_user_id uuid, p_order_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.has_role(p_user_id, 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.salsabil_master_orders o
      WHERE o.id = p_order_id AND o.customer_id = p_user_id
    );
$$;

-- Re-route master_orders RLS through the centralized helper.
DROP POLICY IF EXISTS "Customers read their master orders" ON public.salsabil_master_orders;
DROP POLICY IF EXISTS "Admins manage all master orders"   ON public.salsabil_master_orders;

CREATE POLICY "master_orders_read_centralized"
  ON public.salsabil_master_orders
  FOR SELECT
  USING (public.can_access_order(auth.uid(), id));

CREATE POLICY "master_orders_admin_write"
  ON public.salsabil_master_orders
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- =========================================================================
-- 3) Atomic Savings Jar RPC (deposit / withdraw / settings)
-- =========================================================================
CREATE OR REPLACE FUNCTION public.process_savings_jar_op(
  p_amount          numeric,
  p_kind            text,
  p_label           text,
  p_idempotency_key uuid,
  p_settings        jsonb DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id    uuid := auth.uid();
  v_jar        public.savings_jar%ROWTYPE;
  v_existing   public.savings_transactions%ROWTYPE;
  v_new_bal    numeric;
  v_amt        numeric := COALESCE(p_amount, 0);
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '28000';
  END IF;

  IF p_kind NOT IN ('deposit','withdraw','settings') THEN
    RAISE EXCEPTION 'invalid kind: %', p_kind USING ERRCODE = '22023';
  END IF;

  -- Idempotency replay protection (only for ledger-changing ops)
  IF p_idempotency_key IS NOT NULL AND p_kind <> 'settings' THEN
    SELECT * INTO v_existing
    FROM public.savings_transactions
    WHERE user_id = v_user_id AND idempotency_key = p_idempotency_key
    LIMIT 1;
    IF FOUND THEN
      SELECT * INTO v_jar FROM public.savings_jar WHERE user_id = v_user_id;
      RETURN jsonb_build_object(
        'replayed', true,
        'transaction_id', v_existing.id,
        'balance', v_jar.balance
      );
    END IF;
  END IF;

  -- Lock or create the jar row
  SELECT * INTO v_jar FROM public.savings_jar WHERE user_id = v_user_id FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO public.savings_jar (user_id, balance, auto_save_enabled, round_to, goal, goal_label)
    VALUES (v_user_id, 0, false, 5, NULL, NULL)
    RETURNING * INTO v_jar;
  END IF;

  IF p_kind = 'settings' THEN
    UPDATE public.savings_jar
       SET auto_save_enabled = COALESCE((p_settings->>'auto_save_enabled')::boolean, v_jar.auto_save_enabled),
           round_to          = COALESCE((p_settings->>'round_to')::int,            v_jar.round_to),
           goal              = CASE WHEN p_settings ? 'goal'       THEN NULLIF(p_settings->>'goal','')::numeric ELSE v_jar.goal END,
           goal_label        = CASE WHEN p_settings ? 'goal_label' THEN NULLIF(p_settings->>'goal_label','')   ELSE v_jar.goal_label END,
           updated_at        = now()
     WHERE user_id = v_user_id
     RETURNING * INTO v_jar;
    RETURN jsonb_build_object('balance', v_jar.balance, 'kind', 'settings');
  END IF;

  IF v_amt <= 0 THEN
    RAISE EXCEPTION 'amount must be positive' USING ERRCODE = '22023';
  END IF;

  IF p_kind = 'deposit' THEN
    v_new_bal := v_jar.balance + v_amt;
  ELSE
    IF v_amt > v_jar.balance THEN
      RAISE EXCEPTION 'insufficient balance' USING ERRCODE = 'P0001';
    END IF;
    v_new_bal := v_jar.balance - v_amt;
  END IF;

  UPDATE public.savings_jar
     SET balance = v_new_bal, updated_at = now()
   WHERE user_id = v_user_id;

  INSERT INTO public.savings_transactions (user_id, amount, kind, label, idempotency_key)
  VALUES (v_user_id, v_amt, p_kind, COALESCE(p_label, p_kind), p_idempotency_key)
  RETURNING * INTO v_existing;

  RETURN jsonb_build_object(
    'replayed', false,
    'transaction_id', v_existing.id,
    'balance', v_new_bal,
    'kind', p_kind
  );
END;
$$;

REVOKE ALL ON FUNCTION public.process_savings_jar_op(numeric, text, text, uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_savings_jar_op(numeric, text, text, uuid, jsonb) TO authenticated;

-- =========================================================================
-- 4) Admin-only atomic order status RPC
-- =========================================================================
CREATE OR REPLACE FUNCTION public.admin_set_order_status(
  p_order_id uuid,
  p_status   text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL OR NOT public.has_role(v_uid, 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  IF p_status NOT IN ('pending','confirmed','preparing','out_for_delivery','delivered','cancelled') THEN
    RAISE EXCEPTION 'invalid status: %', p_status USING ERRCODE = '22023';
  END IF;

  UPDATE public.salsabil_master_orders
     SET status = p_status, updated_at = now()
   WHERE id = p_order_id;

  UPDATE public.salsabil_fulfillment_nodes
     SET status       = p_status,
         delivered_at = CASE WHEN p_status = 'delivered' THEN now() ELSE delivered_at END
   WHERE master_order_id = p_order_id;

  RETURN jsonb_build_object('order_id', p_order_id, 'status', p_status);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_order_status(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_set_order_status(uuid, text) TO authenticated;
