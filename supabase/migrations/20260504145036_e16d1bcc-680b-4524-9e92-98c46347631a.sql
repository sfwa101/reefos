
CREATE OR REPLACE FUNCTION public.place_order_atomic_v2(_payload jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid;
  v_order_id uuid;
  v_total numeric;
  v_payment_method text;
  v_address_id uuid;
  v_notes text;
  v_service_type text;
  v_delivery_zone text;
  v_wallet_applied numeric;
  v_wallet_shortfall numeric;
  v_secondary_payment text;
  v_total_cashback numeric;
  v_change_remainder numeric;
  v_save_change boolean;
  v_donate_change boolean;
  v_tip numeric;
  v_promo_code text;
  v_discount numeric;
  v_tip_amount numeric;
  v_charity_amount numeric;
  v_charity_cause_id text;
  v_is_gift boolean;
  v_gift_message text;
  v_upfront_required numeric;
  v_upfront_collected numeric;
  v_fulfillments jsonb;
  v_fulfillment jsonb;
  v_fulfillment_id uuid;
  v_seq smallint := 0;
  v_items jsonb;
  v_item jsonb;
  v_product_id text;
  v_qty integer;
  v_stock integer;
  v_wallet_balance numeric;
BEGIN
  -- ===== Extract & validate header =====
  v_user_id := (_payload->>'user_id')::uuid;

  IF auth.uid() IS NULL OR auth.uid() <> v_user_id THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;

  v_fulfillments := _payload->'fulfillments';
  IF v_fulfillments IS NULL OR jsonb_array_length(v_fulfillments) = 0 THEN
    RAISE EXCEPTION 'empty_cart' USING ERRCODE = '22023';
  END IF;

  v_total              := COALESCE((_payload->>'total')::numeric, 0);
  v_payment_method     := _payload->>'payment_method';
  v_address_id         := NULLIF(_payload->>'address_id','')::uuid;
  v_notes              := _payload->>'notes';
  v_service_type       := COALESCE(_payload->>'service_type', 'delivery');
  v_delivery_zone      := _payload->>'delivery_zone';
  v_wallet_applied     := COALESCE((_payload->>'wallet_applied')::numeric, 0);
  v_wallet_shortfall   := COALESCE((_payload->>'wallet_shortfall')::numeric, 0);
  v_secondary_payment  := _payload->>'secondary_payment';
  v_total_cashback     := COALESCE((_payload->>'total_cashback')::numeric, 0);
  v_change_remainder   := COALESCE((_payload->>'change_remainder')::numeric, 0);
  v_save_change        := COALESCE((_payload->>'save_change')::boolean, false);
  v_donate_change      := COALESCE((_payload->>'donate_change')::boolean, false);
  v_tip                := COALESCE((_payload->>'tip')::numeric, 0);
  v_promo_code         := _payload->>'promo_code';
  v_discount           := COALESCE((_payload->>'discount')::numeric, 0);
  v_tip_amount         := COALESCE((_payload->>'tip_amount')::numeric, v_tip);
  v_charity_amount     := COALESCE((_payload->>'charity_amount')::numeric, 0);
  v_charity_cause_id   := _payload->>'charity_cause_id';
  v_is_gift            := COALESCE((_payload->>'is_gift')::boolean, false);
  v_gift_message       := _payload->>'gift_message';
  v_upfront_required   := COALESCE((_payload->>'upfront_payment_required')::numeric, 0);
  v_upfront_collected  := COALESCE((_payload->>'upfront_payment_collected')::numeric, 0);

  -- ===== Pre-flight: lock products & validate stock across ALL fulfillments =====
  FOR v_fulfillment IN SELECT * FROM jsonb_array_elements(v_fulfillments) LOOP
    v_items := v_fulfillment->'items';
    IF v_items IS NULL OR jsonb_array_length(v_items) = 0 THEN
      RAISE EXCEPTION 'empty_fulfillment' USING ERRCODE = '22023';
    END IF;

    FOR v_item IN SELECT * FROM jsonb_array_elements(v_items) LOOP
      v_product_id := v_item->>'product_id';
      v_qty := COALESCE((v_item->>'quantity')::int, 0);

      IF v_qty <= 0 THEN
        RAISE EXCEPTION 'invalid_quantity:%', v_product_id USING ERRCODE = '22023';
      END IF;

      SELECT stock INTO v_stock FROM public.products WHERE id = v_product_id FOR UPDATE;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'product_not_found:%', v_product_id USING ERRCODE = '02000';
      END IF;
      IF v_stock IS NOT NULL AND v_stock < v_qty THEN
        RAISE EXCEPTION 'out_of_stock:%', v_product_id USING ERRCODE = '22023';
      END IF;
    END LOOP;
  END LOOP;

  -- ===== Wallet balance check =====
  IF v_wallet_applied > 0 THEN
    SELECT balance INTO v_wallet_balance
      FROM public.wallet_balances WHERE user_id = v_user_id FOR UPDATE;
    IF NOT FOUND OR COALESCE(v_wallet_balance, 0) < v_wallet_applied THEN
      RAISE EXCEPTION 'insufficient_wallet_balance' USING ERRCODE = '22023';
    END IF;
  END IF;

  -- ===== Insert order header =====
  INSERT INTO public.orders (
    user_id, total, payment_method, address_id, notes, service_type, delivery_zone,
    wallet_applied, wallet_shortfall, secondary_payment, total_cashback,
    change_remainder, save_change, donate_change, tip, promo_code, discount,
    tip_amount, charity_amount, charity_cause_id,
    is_gift, gift_message,
    upfront_payment_required, upfront_payment_collected
  ) VALUES (
    v_user_id, v_total, v_payment_method, v_address_id, v_notes, v_service_type, v_delivery_zone,
    v_wallet_applied, v_wallet_shortfall, v_secondary_payment, v_total_cashback,
    v_change_remainder, v_save_change, v_donate_change, v_tip, v_promo_code, v_discount,
    v_tip_amount, v_charity_amount, v_charity_cause_id,
    v_is_gift, v_gift_message,
    v_upfront_required, v_upfront_collected
  ) RETURNING id INTO v_order_id;

  -- ===== Insert each fulfillment + its items =====
  FOR v_fulfillment IN SELECT * FROM jsonb_array_elements(v_fulfillments) LOOP
    v_seq := v_seq + 1;

    INSERT INTO public.fulfillments (
      order_id, sequence, status,
      delivery_method_id, scheduled_for, eta_minutes,
      delivery_fee, notes
    ) VALUES (
      v_order_id,
      COALESCE((v_fulfillment->>'sequence')::smallint, v_seq),
      COALESCE((v_fulfillment->>'status')::fulfillment_status, 'pending'::fulfillment_status),
      NULLIF(v_fulfillment->>'delivery_method_id','')::uuid,
      NULLIF(v_fulfillment->>'scheduled_for','')::timestamptz,
      NULLIF(v_fulfillment->>'eta_minutes','')::integer,
      COALESCE((v_fulfillment->>'delivery_fee')::numeric, 0),
      v_fulfillment->>'notes'
    ) RETURNING id INTO v_fulfillment_id;

    FOR v_item IN SELECT * FROM jsonb_array_elements(v_fulfillment->'items') LOOP
      v_product_id := v_item->>'product_id';
      v_qty := COALESCE((v_item->>'quantity')::int, 0);

      INSERT INTO public.order_items (
        order_id, fulfillment_id,
        product_id, product_name, product_image, price, quantity,
        is_preorder, requires_downpayment
      ) VALUES (
        v_order_id, v_fulfillment_id,
        v_product_id,
        COALESCE(v_item->>'product_name', ''),
        v_item->>'product_image',
        COALESCE((v_item->>'price')::numeric, 0),
        v_qty,
        COALESCE((v_item->>'is_preorder')::boolean, false),
        COALESCE((v_item->>'requires_downpayment')::boolean, false)
      );

      UPDATE public.products
         SET stock = GREATEST(COALESCE(stock,0) - v_qty, 0)
       WHERE id = v_product_id;
    END LOOP;
  END LOOP;

  -- ===== Wallet debit =====
  IF v_wallet_applied > 0 THEN
    UPDATE public.wallet_balances
       SET balance = balance - v_wallet_applied, updated_at = now()
     WHERE user_id = v_user_id;

    INSERT INTO public.wallet_transactions (user_id, kind, label, amount, source, reference_order_id, status)
    VALUES (v_user_id, 'debit', 'دفع طلب #' || substr(v_order_id::text,1,8),
            v_wallet_applied, 'order', v_order_id, 'cleared');
  END IF;

  -- ===== Cashback credit =====
  IF v_total_cashback > 0 THEN
    INSERT INTO public.wallet_balances (user_id, balance, cashback)
    VALUES (v_user_id, 0, v_total_cashback)
    ON CONFLICT (user_id) DO UPDATE
      SET cashback = public.wallet_balances.cashback + EXCLUDED.cashback,
          updated_at = now();

    INSERT INTO public.wallet_transactions (user_id, kind, label, amount, source, reference_order_id, status)
    VALUES (v_user_id, 'credit', 'كاش باك على الطلب', v_total_cashback, 'cashback', v_order_id, 'cleared');
  END IF;

  -- ===== Change jar =====
  IF v_save_change AND v_change_remainder > 0 THEN
    INSERT INTO public.savings_jar (user_id, balance)
    VALUES (v_user_id, v_change_remainder)
    ON CONFLICT (user_id) DO UPDATE
      SET balance = public.savings_jar.balance + EXCLUDED.balance,
          updated_at = now();
  END IF;

  IF v_donate_change AND v_change_remainder > 0 THEN
    INSERT INTO public.order_outbox (order_id, channel, recipient, payload)
    VALUES (v_order_id, 'admin', NULL,
      jsonb_build_object('type','donation','amount', v_change_remainder));
  END IF;

  -- ===== Charity event (logged for finance ledger downstream) =====
  IF v_charity_amount > 0 THEN
    INSERT INTO public.order_outbox (order_id, channel, recipient, payload)
    VALUES (v_order_id, 'admin', NULL,
      jsonb_build_object('type','charity',
                         'amount', v_charity_amount,
                         'cause_id', v_charity_cause_id));
  END IF;

  -- ===== WhatsApp notify =====
  INSERT INTO public.order_outbox (order_id, channel, recipient, payload)
  VALUES (v_order_id, 'whatsapp', NULL,
    jsonb_build_object('order_id', v_order_id, 'total', v_total, 'payment', v_payment_method));

  RETURN v_order_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.place_order_atomic_v2(jsonb) TO authenticated;
