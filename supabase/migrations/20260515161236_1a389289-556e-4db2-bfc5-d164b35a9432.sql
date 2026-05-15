
CREATE OR REPLACE FUNCTION public.record_driver_cod_collection(
  _node_id uuid,
  _confirmed_amount numeric
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_driver_id uuid;
  v_node_driver uuid;
  v_node_status text;
  v_master_order_id uuid;
  v_total numeric;
  v_payment_status text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '28000';
  END IF;

  SELECT id INTO v_driver_id FROM public.drivers WHERE user_id = v_user_id LIMIT 1;
  IF v_driver_id IS NULL THEN
    RAISE EXCEPTION 'driver_not_linked';
  END IF;

  SELECT n.driver_id, n.status, n.master_order_id
    INTO v_node_driver, v_node_status, v_master_order_id
  FROM public.salsabil_fulfillment_nodes n
  WHERE n.id = _node_id;

  IF v_master_order_id IS NULL THEN
    RAISE EXCEPTION 'task_not_found';
  END IF;
  IF v_node_driver IS DISTINCT FROM v_driver_id THEN
    RAISE EXCEPTION 'not_assigned_to_you';
  END IF;
  IF v_node_status <> 'delivered' THEN
    RAISE EXCEPTION 'task_not_delivered';
  END IF;

  SELECT total_amount, payment_status
    INTO v_total, v_payment_status
  FROM public.salsabil_master_orders
  WHERE id = v_master_order_id
  FOR UPDATE;

  IF v_payment_status = 'paid' THEN
    RAISE EXCEPTION 'order_already_paid';
  END IF;

  -- Single source of truth: amount MUST match server-side total (1 piaster tolerance)
  IF abs(coalesce(_confirmed_amount, 0) - v_total) > 0.01 THEN
    RAISE EXCEPTION 'amount_mismatch: expected %, got %', v_total, _confirmed_amount;
  END IF;

  UPDATE public.salsabil_master_orders
  SET payment_status = 'paid', paid_at = now()
  WHERE id = v_master_order_id;

  INSERT INTO public.driver_wallets(driver_id, cash_in_hand, earned_balance, lifetime_earned, lifetime_settled)
  VALUES (v_driver_id, v_total, 0, 0, 0)
  ON CONFLICT (driver_id) DO UPDATE
    SET cash_in_hand = public.driver_wallets.cash_in_hand + EXCLUDED.cash_in_hand,
        updated_at = now();

  RETURN jsonb_build_object('ok', true, 'amount', v_total, 'order_id', v_master_order_id);
END;
$$;

REVOKE ALL ON FUNCTION public.record_driver_cod_collection(uuid, numeric) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.record_driver_cod_collection(uuid, numeric) TO authenticated;
