-- WAVE C-5 · Deep Veto & Overload Purge
-- Drop both conflicting overloads of process_checkout_sovereign and recreate
-- a single unified signature that performs the snapshot-hash veto inside the
-- database itself (Article 7.1 — Sovereign Veto at the source).

DROP FUNCTION IF EXISTS public.process_checkout_sovereign(uuid, jsonb, jsonb, uuid);
DROP FUNCTION IF EXISTS public.process_checkout_sovereign(uuid, jsonb, jsonb, text, uuid);
DROP FUNCTION IF EXISTS public.process_checkout_sovereign(uuid, jsonb, jsonb, uuid, text, text);

CREATE OR REPLACE FUNCTION public.process_checkout_sovereign(
  p_customer_id            uuid,
  p_cart_items             jsonb,
  p_delivery_info          jsonb,
  p_idempotency_key        uuid,
  p_payment_method         text,
  p_expected_snapshot_hash text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_master_id     uuid;
  v_existing_id   uuid;
  v_item          jsonb;
  v_legacy_id     text;
  v_qty           int;
  v_sku_id        uuid;
  v_match         record;
  v_unit_price    numeric(14,2);
  v_snapshot      numeric(14,2);
  v_line_total    numeric(14,2);
  v_node_id       uuid;
  v_grand_total   numeric(14,2) := 0;
  v_current_count int;
  v_customer_wallet record;
  v_treasury_wallet_id constant uuid := '00000000-0000-0000-0000-000000000777';
  v_sovereign_vendor_id constant uuid := '00000000-0000-0000-0000-000000000000';
  v_txn_group_id  uuid;
  v_snapshot_row  record;
BEGIN
  -- ──────────────────── Sovereign Veto (Article 7.1) ────────────────────
  -- The hash MUST exist in the cashier_snapshots ledger (written by the
  -- preview server fn). If it doesn't, the cart was either tampered with,
  -- never previewed, or the DNA drifted between preview and checkout.
  IF p_expected_snapshot_hash IS NULL OR length(p_expected_snapshot_hash) < 8 THEN
    RAISE EXCEPTION 'price_tamper: missing expected_snapshot_hash';
  END IF;

  SELECT snapshot_hash INTO v_snapshot_row
    FROM public.cashier_snapshots
   WHERE snapshot_hash = p_expected_snapshot_hash
   LIMIT 1;

  IF v_snapshot_row.snapshot_hash IS NULL THEN
    RAISE EXCEPTION 'price_tamper: snapshot_hash % not found in sovereign ledger', p_expected_snapshot_hash;
  END IF;

  IF p_customer_id IS NULL THEN
    RAISE EXCEPTION 'customer_id required';
  END IF;
  IF p_cart_items IS NULL OR jsonb_array_length(p_cart_items) = 0 THEN
    RAISE EXCEPTION 'cart is empty';
  END IF;
  IF COALESCE(p_payment_method, 'cash_on_delivery') NOT IN ('wallet','cash_on_delivery') THEN
    RAISE EXCEPTION 'invalid payment_method: %', p_payment_method;
  END IF;

  -- IDEMPOTENCY GATE
  IF p_idempotency_key IS NOT NULL THEN
    SELECT id INTO v_existing_id
      FROM public.salsabil_master_orders
     WHERE idempotency_key = p_idempotency_key
     LIMIT 1;
    IF v_existing_id IS NOT NULL THEN
      RETURN v_existing_id;
    END IF;
  END IF;

  -- 1. Master order
  INSERT INTO public.salsabil_master_orders
    (customer_id, delivery_info, status, total_amount, idempotency_key, payment_status)
  VALUES
    (p_customer_id, COALESCE(p_delivery_info, '{}'::jsonb), 'pending', 0, p_idempotency_key, 'pending')
  RETURNING id INTO v_master_id;

  -- 2. Iterate cart items
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_cart_items)
  LOOP
    v_legacy_id := v_item->>'product_id';
    v_qty       := COALESCE((v_item->>'quantity')::int, 1);
    v_snapshot  := NULLIF(v_item->>'unit_price_snapshot','')::numeric(14,2);
    IF v_qty <= 0 THEN CONTINUE; END IF;

    v_sku_id := public.resolve_legacy_product_to_sku(v_legacy_id);
    IF v_sku_id IS NULL THEN
      RAISE EXCEPTION 'Cannot resolve product % to a Sovereign SKU', v_legacy_id;
    END IF;

    SELECT m.id            AS matrix_id,
           m.location_code AS vendor_id_text,
           m.availability_data,
           COALESCE((m.availability_data->>'count')::int, 0)            AS in_stock,
           COALESCE((m.availability_data->>'override_price')::numeric,
                    (SELECT base_price FROM public.salsabil_financial_contracts
                      WHERE sku_id = m.sku_id AND is_active = true
                      ORDER BY created_at DESC LIMIT 1))                AS price
      INTO v_match
      FROM public.salsabil_inventory_matrix m
     WHERE m.sku_id = v_sku_id
       AND m.location_code IS NOT NULL
       AND COALESCE((m.availability_data->>'count')::int, 0) >= v_qty
     ORDER BY COALESCE((m.availability_data->>'override_price')::numeric, 999999999) ASC NULLS LAST,
              m.updated_at ASC
     LIMIT 1
     FOR UPDATE;

    IF v_match.matrix_id IS NULL THEN
      RAISE EXCEPTION 'insufficient_stock for SKU % (legacy %)', v_sku_id, v_legacy_id;
    END IF;

    v_unit_price := COALESCE(v_match.price, 0);

    IF v_snapshot IS NOT NULL AND abs(v_unit_price - v_snapshot) > 0.01 THEN
      RAISE EXCEPTION 'price_changed for SKU % (server=%, client=%)', v_sku_id, v_unit_price, v_snapshot;
    END IF;

    v_line_total := v_unit_price * v_qty;

    v_current_count := COALESCE((v_match.availability_data->>'count')::int, 0);
    UPDATE public.salsabil_inventory_matrix
       SET availability_data = jsonb_set(
             availability_data, '{count}',
             to_jsonb(v_current_count - v_qty), true)
     WHERE id = v_match.matrix_id;

    INSERT INTO public.salsabil_fulfillment_nodes
      (master_order_id, vendor_id, status, total_amount)
    VALUES (v_master_id, v_sovereign_vendor_id, 'pending', v_line_total)
    RETURNING id INTO v_node_id;

    INSERT INTO public.salsabil_fulfillment_items
      (node_id, sku_id, quantity, price_at_time)
    VALUES (v_node_id, v_sku_id, v_qty, v_unit_price);

    v_grand_total := v_grand_total + v_line_total;
  END LOOP;

  UPDATE public.salsabil_master_orders
     SET total_amount = v_grand_total
   WHERE id = v_master_id;

  -- 3. Payment settlement
  IF COALESCE(p_payment_method, 'cash_on_delivery') = 'wallet' THEN
    SELECT id, balance, currency
      INTO v_customer_wallet
      FROM public.wallets
     WHERE user_id = p_customer_id
       AND status = 'active'
     ORDER BY updated_at DESC
     LIMIT 1
     FOR UPDATE;

    IF v_customer_wallet.id IS NULL THEN
      RAISE EXCEPTION 'wallet_not_found for customer %', p_customer_id;
    END IF;

    IF v_customer_wallet.balance < v_grand_total THEN
      RAISE EXCEPTION 'insufficient_funds (balance=%, required=%)', v_customer_wallet.balance, v_grand_total;
    END IF;

    v_txn_group_id := gen_random_uuid();

    INSERT INTO public.ledger_entries
      (wallet_id, transaction_group_id, amount, currency, description,
       idempotency_key, counterparty_wallet_id)
    VALUES
      (v_customer_wallet.id, v_txn_group_id, -v_grand_total, v_customer_wallet.currency,
       'Order payment ' || v_master_id::text,
       'order:' || v_master_id::text || ':debit',
       v_treasury_wallet_id);

    INSERT INTO public.ledger_entries
      (wallet_id, transaction_group_id, amount, currency, description,
       idempotency_key, counterparty_wallet_id)
    VALUES
      (v_treasury_wallet_id, v_txn_group_id, v_grand_total, v_customer_wallet.currency,
       'Order receipt ' || v_master_id::text,
       'order:' || v_master_id::text || ':credit',
       v_customer_wallet.id);

    UPDATE public.wallets SET balance = balance - v_grand_total, updated_at = now()
     WHERE id = v_customer_wallet.id;
    UPDATE public.wallets SET balance = balance + v_grand_total, updated_at = now()
     WHERE id = v_treasury_wallet_id;

    UPDATE public.salsabil_master_orders
       SET payment_status = 'paid', paid_at = now(), status = 'confirmed'
     WHERE id = v_master_id;
  END IF;

  RETURN v_master_id;
END;
$function$;