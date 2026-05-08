-- Phase 36: Idempotent checkout
ALTER TABLE public.salsabil_master_orders
  ADD COLUMN IF NOT EXISTS idempotency_key uuid;

CREATE UNIQUE INDEX IF NOT EXISTS salsabil_master_orders_idempotency_key_uniq
  ON public.salsabil_master_orders (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- Drop the legacy 3-arg signature; replace with idempotent 4-arg version.
DROP FUNCTION IF EXISTS public.process_checkout_sovereign(uuid, jsonb, jsonb);

CREATE OR REPLACE FUNCTION public.process_checkout_sovereign(
  p_customer_id     uuid,
  p_cart_items      jsonb,
  p_delivery_info   jsonb,
  p_idempotency_key uuid DEFAULT NULL
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
  v_line_total    numeric(14,2);
  v_node_id       uuid;
  v_grand_total   numeric(14,2) := 0;
  v_current_count int;
BEGIN
  IF p_customer_id IS NULL THEN
    RAISE EXCEPTION 'customer_id required';
  END IF;
  IF p_cart_items IS NULL OR jsonb_array_length(p_cart_items) = 0 THEN
    RAISE EXCEPTION 'cart is empty';
  END IF;

  -- IDEMPOTENCY GATE: if this key was already used, return the prior order.
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
    (customer_id, delivery_info, status, total_amount, idempotency_key)
  VALUES
    (p_customer_id, COALESCE(p_delivery_info, '{}'::jsonb), 'pending', 0, p_idempotency_key)
  RETURNING id INTO v_master_id;

  -- 2. Iterate cart
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_cart_items)
  LOOP
    v_legacy_id := v_item->>'product_id';
    v_qty       := COALESCE((v_item->>'quantity')::int, 1);
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
      RAISE EXCEPTION 'Insufficient stock for SKU % (legacy %)', v_sku_id, v_legacy_id;
    END IF;

    v_unit_price := COALESCE(v_match.price, 0);
    v_line_total := v_unit_price * v_qty;

    v_current_count := COALESCE((v_match.availability_data->>'count')::int, 0);
    UPDATE public.salsabil_inventory_matrix
       SET availability_data = jsonb_set(
             availability_data, '{count}',
             to_jsonb(v_current_count - v_qty), true)
     WHERE id = v_match.matrix_id;

    INSERT INTO public.salsabil_fulfillment_nodes
      (master_order_id, vendor_id, status, total_amount)
    VALUES (v_master_id, NULL, 'pending', v_line_total)
    RETURNING id INTO v_node_id;

    INSERT INTO public.salsabil_fulfillment_items
      (node_id, sku_id, quantity, unit_price, line_total)
    VALUES (v_node_id, v_sku_id, v_qty, v_unit_price, v_line_total);

    v_grand_total := v_grand_total + v_line_total;
  END LOOP;

  UPDATE public.salsabil_master_orders
     SET total_amount = v_grand_total
   WHERE id = v_master_id;

  RETURN v_master_id;
END;
$function$;