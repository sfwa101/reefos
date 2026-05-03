
-- ============================================================
-- 1) order_has_vendor_store — re-assert SECURITY DEFINER (idempotent)
-- ============================================================
CREATE OR REPLACE FUNCTION public.order_has_vendor_store(_order_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.order_items oi
    WHERE oi.order_id = _order_id
      AND oi.store_id IN (SELECT public.user_store_ids(_user_id))
  );
$function$;

-- ============================================================
-- 2) order_outbox — outbound notification queue
-- ============================================================
CREATE TABLE IF NOT EXISTS public.order_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  channel text NOT NULL,                          -- 'whatsapp' | 'push' | 'vendor' | 'admin'
  recipient text,                                  -- phone, user_id, store_id, etc.
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',          -- pending | sent | failed
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  scheduled_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_outbox_status_sched
  ON public.order_outbox(status, scheduled_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_order_outbox_order ON public.order_outbox(order_id);

ALTER TABLE public.order_outbox ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "outbox_owner_select" ON public.order_outbox;
CREATE POLICY "outbox_owner_select" ON public.order_outbox
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_outbox.order_id AND o.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "outbox_staff_all" ON public.order_outbox;
CREATE POLICY "outbox_staff_all" ON public.order_outbox
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'finance'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role)
           OR public.has_role(auth.uid(), 'finance'::app_role));

-- ============================================================
-- 3) Add the 10 missing columns to orders
-- ============================================================
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS wallet_applied numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS wallet_shortfall numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS secondary_payment text,
  ADD COLUMN IF NOT EXISTS total_cashback numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS change_remainder numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS save_change boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS donate_change boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS tip numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS promo_code text,
  ADD COLUMN IF NOT EXISTS discount numeric(12,2) NOT NULL DEFAULT 0;

-- ============================================================
-- 4) order_items.product_id → products.id  (FK for nested selects)
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.order_items'::regclass
      AND conname = 'order_items_product_id_fkey'
  ) THEN
    -- Clean up any orphan product_ids before adding FK
    DELETE FROM public.order_items oi
    WHERE NOT EXISTS (SELECT 1 FROM public.products p WHERE p.id = oi.product_id);

    ALTER TABLE public.order_items
      ADD CONSTRAINT order_items_product_id_fkey
      FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;
  END IF;
END$$;

-- ============================================================
-- 5) place_order_atomic — replace with enriched 18-param signature
-- ============================================================
DROP FUNCTION IF EXISTS public.place_order_atomic(uuid, numeric, text, uuid, text, text, text, jsonb);

CREATE OR REPLACE FUNCTION public.place_order_atomic(
  _user_id uuid,
  _total numeric,
  _payment_method text,
  _address_id uuid,
  _notes text,
  _service_type text,
  _delivery_zone text,
  _items jsonb,
  _wallet_applied numeric DEFAULT 0,
  _wallet_shortfall numeric DEFAULT 0,
  _secondary_payment text DEFAULT NULL,
  _total_cashback numeric DEFAULT 0,
  _change_remainder numeric DEFAULT 0,
  _save_change boolean DEFAULT false,
  _donate_change boolean DEFAULT false,
  _tip numeric DEFAULT 0,
  _promo_code text DEFAULT NULL,
  _discount numeric DEFAULT 0
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_order_id uuid;
  v_item jsonb;
  v_product_id text;
  v_qty integer;
  v_stock integer;
  v_wallet_balance numeric;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> _user_id THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;

  IF _items IS NULL OR jsonb_array_length(_items) = 0 THEN
    RAISE EXCEPTION 'empty_cart' USING ERRCODE = '22023';
  END IF;

  -- Validate stock & lock products
  FOR v_item IN SELECT * FROM jsonb_array_elements(_items) LOOP
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

  -- Validate wallet balance if applied
  IF COALESCE(_wallet_applied, 0) > 0 THEN
    SELECT balance INTO v_wallet_balance
      FROM public.wallet_balances WHERE user_id = _user_id FOR UPDATE;
    IF NOT FOUND OR COALESCE(v_wallet_balance, 0) < _wallet_applied THEN
      RAISE EXCEPTION 'insufficient_wallet_balance' USING ERRCODE = '22023';
    END IF;
  END IF;

  -- Insert the order
  INSERT INTO public.orders (
    user_id, total, payment_method, address_id, notes, service_type, delivery_zone,
    wallet_applied, wallet_shortfall, secondary_payment, total_cashback,
    change_remainder, save_change, donate_change, tip, promo_code, discount
  ) VALUES (
    _user_id, _total, _payment_method, _address_id, _notes, _service_type, _delivery_zone,
    COALESCE(_wallet_applied,0), COALESCE(_wallet_shortfall,0), _secondary_payment,
    COALESCE(_total_cashback,0), COALESCE(_change_remainder,0),
    COALESCE(_save_change,false), COALESCE(_donate_change,false),
    COALESCE(_tip,0), _promo_code, COALESCE(_discount,0)
  ) RETURNING id INTO v_order_id;

  -- Insert items + decrement stock
  FOR v_item IN SELECT * FROM jsonb_array_elements(_items) LOOP
    v_product_id := v_item->>'product_id';
    v_qty := COALESCE((v_item->>'quantity')::int, 0);

    INSERT INTO public.order_items (
      order_id, product_id, product_name, product_image, price, quantity
    ) VALUES (
      v_order_id,
      v_product_id,
      COALESCE(v_item->>'product_name', ''),
      v_item->>'product_image',
      COALESCE((v_item->>'price')::numeric, 0),
      v_qty
    );

    UPDATE public.products
       SET stock = GREATEST(COALESCE(stock,0) - v_qty, 0)
     WHERE id = v_product_id;
  END LOOP;

  -- Debit wallet
  IF COALESCE(_wallet_applied, 0) > 0 THEN
    UPDATE public.wallet_balances
       SET balance = balance - _wallet_applied, updated_at = now()
     WHERE user_id = _user_id;

    INSERT INTO public.wallet_transactions (user_id, kind, label, amount, source, reference_order_id, status)
    VALUES (_user_id, 'debit', 'دفع طلب #' || substr(v_order_id::text,1,8), _wallet_applied, 'order', v_order_id, 'cleared');
  END IF;

  -- Credit cashback
  IF COALESCE(_total_cashback, 0) > 0 THEN
    INSERT INTO public.wallet_balances (user_id, balance, cashback)
    VALUES (_user_id, 0, _total_cashback)
    ON CONFLICT (user_id) DO UPDATE
      SET cashback = public.wallet_balances.cashback + EXCLUDED.cashback,
          updated_at = now();

    INSERT INTO public.wallet_transactions (user_id, kind, label, amount, source, reference_order_id, status)
    VALUES (_user_id, 'credit', 'كاش باك على الطلب', _total_cashback, 'cashback', v_order_id, 'cleared');
  END IF;

  -- Save change to jar
  IF COALESCE(_save_change,false) AND COALESCE(_change_remainder,0) > 0 THEN
    INSERT INTO public.savings_jar (user_id, balance)
    VALUES (_user_id, _change_remainder)
    ON CONFLICT (user_id) DO UPDATE
      SET balance = public.savings_jar.balance + EXCLUDED.balance,
          updated_at = now();
  END IF;

  -- Donate change → record as outbox event for downstream finance processing
  IF COALESCE(_donate_change,false) AND COALESCE(_change_remainder,0) > 0 THEN
    INSERT INTO public.order_outbox (order_id, channel, recipient, payload)
    VALUES (v_order_id, 'admin', NULL,
      jsonb_build_object('type','donation','amount',_change_remainder));
  END IF;

  -- Enqueue WhatsApp notification
  INSERT INTO public.order_outbox (order_id, channel, recipient, payload)
  VALUES (v_order_id, 'whatsapp', NULL,
    jsonb_build_object('order_id', v_order_id, 'total', _total, 'payment', _payment_method));

  RETURN v_order_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.place_order_atomic(
  uuid, numeric, text, uuid, text, text, text, jsonb,
  numeric, numeric, text, numeric, numeric, boolean, boolean, numeric, text, numeric
) TO authenticated;
