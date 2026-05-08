-- ============================================================================
-- Phase 10.1 — The Sovereign Router & Legacy Bridge
-- ============================================================================

-- 1. Master Orders ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.salsabil_master_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_amount numeric(14,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  delivery_info jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_master_orders_customer ON public.salsabil_master_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_master_orders_status   ON public.salsabil_master_orders(status);

ALTER TABLE public.salsabil_master_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage all master orders"   ON public.salsabil_master_orders;
DROP POLICY IF EXISTS "Customers read their master orders" ON public.salsabil_master_orders;

CREATE POLICY "Admins manage all master orders"
  ON public.salsabil_master_orders
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Customers read their master orders"
  ON public.salsabil_master_orders
  FOR SELECT
  TO authenticated
  USING (auth.uid() = customer_id);

CREATE TRIGGER trg_master_orders_touch
  BEFORE UPDATE ON public.salsabil_master_orders
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 2. Add delivery_snapshot to fulfillment nodes -----------------------------
ALTER TABLE public.salsabil_fulfillment_nodes
  ADD COLUMN IF NOT EXISTS delivery_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.salsabil_fulfillment_nodes
  ADD CONSTRAINT salsabil_fulfillment_nodes_master_fk
  FOREIGN KEY (master_order_id) REFERENCES public.salsabil_master_orders(id) ON DELETE CASCADE
  NOT VALID;

-- 3. Legacy bridge ----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.resolve_legacy_product_to_sku(p_legacy_id text)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sku uuid;
  v_meta jsonb;
BEGIN
  IF p_legacy_id IS NULL OR length(p_legacy_id) = 0 THEN
    RETURN NULL;
  END IF;

  -- Direct UUID
  BEGIN
    v_sku := p_legacy_id::uuid;
    IF EXISTS (SELECT 1 FROM public.salsabil_skus WHERE id = v_sku) THEN
      RETURN v_sku;
    END IF;
  EXCEPTION WHEN invalid_text_representation THEN
    -- not a uuid, fall through
    NULL;
  END;

  -- usa_<uuid> prefix
  IF p_legacy_id LIKE 'usa\_%' ESCAPE '\' THEN
    BEGIN
      v_sku := substring(p_legacy_id FROM 5)::uuid;
      IF EXISTS (SELECT 1 FROM public.salsabil_skus WHERE id = v_sku) THEN
        RETURN v_sku;
      END IF;
    EXCEPTION WHEN invalid_text_representation THEN
      NULL;
    END;
  END IF;

  -- Lookup via legacy products.metadata.usa_sku_id
  SELECT metadata INTO v_meta FROM public.products WHERE id = p_legacy_id;
  IF v_meta IS NOT NULL AND v_meta ? 'usa_sku_id' THEN
    BEGIN
      v_sku := (v_meta->>'usa_sku_id')::uuid;
      RETURN v_sku;
    EXCEPTION WHEN invalid_text_representation THEN
      RETURN NULL;
    END;
  END IF;

  RETURN NULL;
END;
$$;

-- 4. Sovereign checkout RPC -------------------------------------------------
CREATE OR REPLACE FUNCTION public.process_checkout_sovereign(
  p_customer_id   uuid,
  p_cart_items    jsonb,
  p_delivery_info jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_master_id   uuid;
  v_item        jsonb;
  v_legacy_id   text;
  v_qty         int;
  v_sku_id      uuid;
  v_match       record;
  v_unit_price  numeric(14,2);
  v_line_total  numeric(14,2);
  v_node_id     uuid;
  v_grand_total numeric(14,2) := 0;
  v_current_count int;
BEGIN
  IF p_customer_id IS NULL THEN
    RAISE EXCEPTION 'customer_id required';
  END IF;
  IF p_cart_items IS NULL OR jsonb_array_length(p_cart_items) = 0 THEN
    RAISE EXCEPTION 'cart is empty';
  END IF;

  -- 1. Master order
  INSERT INTO public.salsabil_master_orders (customer_id, delivery_info, status, total_amount)
  VALUES (p_customer_id, COALESCE(p_delivery_info, '{}'::jsonb), 'pending', 0)
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

    -- 3. Pick cheapest vendor with enough stock (FOR UPDATE to prevent races)
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

    -- 4. Decrement stock
    v_current_count := COALESCE((v_match.availability_data->>'count')::int, 0);
    UPDATE public.salsabil_inventory_matrix
       SET availability_data = jsonb_set(
             availability_data,
             '{count}',
             to_jsonb(v_current_count - v_qty),
             true)
     WHERE id = v_match.matrix_id;

    -- 5. Upsert fulfillment node for (master, vendor)
    SELECT id INTO v_node_id
      FROM public.salsabil_fulfillment_nodes
     WHERE master_order_id = v_master_id
       AND vendor_id = v_match.vendor_id_text::uuid
     LIMIT 1;

    IF v_node_id IS NULL THEN
      INSERT INTO public.salsabil_fulfillment_nodes
        (master_order_id, vendor_id, status, total_amount, delivery_snapshot)
      VALUES
        (v_master_id, v_match.vendor_id_text::uuid, 'pending', v_line_total,
         COALESCE(p_delivery_info, '{}'::jsonb))
      RETURNING id INTO v_node_id;
    ELSE
      UPDATE public.salsabil_fulfillment_nodes
         SET total_amount      = total_amount + v_line_total,
             delivery_snapshot = COALESCE(p_delivery_info, delivery_snapshot)
       WHERE id = v_node_id;
    END IF;

    -- 6. Insert fulfillment item
    INSERT INTO public.salsabil_fulfillment_items
      (node_id, sku_id, quantity, price_at_time)
    VALUES
      (v_node_id, v_sku_id, v_qty, v_unit_price);

    v_grand_total := v_grand_total + v_line_total;
  END LOOP;

  -- 7. Roll up master total
  UPDATE public.salsabil_master_orders
     SET total_amount = v_grand_total
   WHERE id = v_master_id;

  RETURN v_master_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.process_checkout_sovereign(uuid, jsonb, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_legacy_product_to_sku(text)            TO authenticated;
