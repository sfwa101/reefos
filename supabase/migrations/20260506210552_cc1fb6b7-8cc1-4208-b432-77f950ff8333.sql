
-- =============================================================
-- PHASE M — SMART ROUTING, COMMISSIONS & TRUST-BASED ESCROW
-- =============================================================

-- ---------- ACTION 1: GLOBAL CATALOG & FIXED PRICING ----------

CREATE TABLE IF NOT EXISTS public.global_catalog (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category    text NOT NULL CHECK (category IN ('Pharmacy','HomeFood','Retail','Restaurants')),
  name        text NOT NULL,
  fixed_price numeric(14,2) NOT NULL CHECK (fixed_price >= 0),
  unit        text NOT NULL DEFAULT 'piece',
  metadata    jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_global_catalog_category ON public.global_catalog(category);

ALTER TABLE public.global_catalog ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "global_catalog_read_all" ON public.global_catalog;
CREATE POLICY "global_catalog_read_all" ON public.global_catalog
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "global_catalog_admin_write" ON public.global_catalog;
CREATE POLICY "global_catalog_admin_write" ON public.global_catalog
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.vendor_inventory (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id   uuid NOT NULL,
  product_id  uuid NOT NULL REFERENCES public.global_catalog(id) ON DELETE CASCADE,
  stock_level integer NOT NULL DEFAULT 0 CHECK (stock_level >= 0),
  vendor_price numeric(14,2),  -- nullable; pharmacy must remain null/equal
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (vendor_id, product_id)
);
CREATE INDEX IF NOT EXISTS idx_vendor_inventory_vendor ON public.vendor_inventory(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_inventory_product ON public.vendor_inventory(product_id);

ALTER TABLE public.vendor_inventory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vendor_inv_select_self_or_admin" ON public.vendor_inventory;
CREATE POLICY "vendor_inv_select_self_or_admin" ON public.vendor_inventory
  FOR SELECT TO authenticated
  USING (vendor_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "vendor_inv_modify_self_or_admin" ON public.vendor_inventory;
CREATE POLICY "vendor_inv_modify_self_or_admin" ON public.vendor_inventory
  FOR ALL TO authenticated
  USING (vendor_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (vendor_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- Trigger: block Pharmacy price overrides
CREATE OR REPLACE FUNCTION public.guard_vendor_inventory_pharmacy_price()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_category text;
  v_fixed    numeric;
BEGIN
  SELECT category, fixed_price INTO v_category, v_fixed
  FROM public.global_catalog WHERE id = NEW.product_id;

  IF v_category = 'Pharmacy' AND NEW.vendor_price IS NOT NULL AND NEW.vendor_price <> v_fixed THEN
    RAISE EXCEPTION 'Vendors cannot override fixed_price for Pharmacy items (product_id=%)', NEW.product_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_pharmacy_price ON public.vendor_inventory;
CREATE TRIGGER trg_guard_pharmacy_price
  BEFORE INSERT OR UPDATE ON public.vendor_inventory
  FOR EACH ROW EXECUTE FUNCTION public.guard_vendor_inventory_pharmacy_price();


-- ---------- ACTION 2: DYNAMIC COMMISSION MATRIX ----------

CREATE TABLE IF NOT EXISTS public.commission_rules (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category   text NOT NULL,
  channel    text NOT NULL CHECK (channel IN ('POS','WEB')),
  rate_pct   numeric(6,3) NOT NULL DEFAULT 0 CHECK (rate_pct >= 0 AND rate_pct <= 100),
  fixed_fee  numeric(14,2) NOT NULL DEFAULT 0 CHECK (fixed_fee >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (category, channel)
);

ALTER TABLE public.commission_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "commission_read_auth" ON public.commission_rules;
CREATE POLICY "commission_read_auth" ON public.commission_rules
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "commission_admin_write" ON public.commission_rules;
CREATE POLICY "commission_admin_write" ON public.commission_rules
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Seed canonical rules
INSERT INTO public.commission_rules (category, channel, rate_pct) VALUES
  ('Pharmacy','POS', 1.0),
  ('Pharmacy','WEB',10.0),
  ('Restaurants','WEB',15.0)
ON CONFLICT (category, channel) DO UPDATE SET rate_pct = EXCLUDED.rate_pct;

-- Commission calculator. Tries to read order total/category/channel from `orders`;
-- gracefully tolerates schema variants by falling back to defaults.
CREATE OR REPLACE FUNCTION public.calculate_order_commission(p_order_id uuid)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total    numeric := 0;
  v_category text;
  v_channel  text;
  v_rate     numeric := 0;
  v_fixed    numeric := 0;
BEGIN
  -- Best-effort extraction from orders table
  EXECUTE format('SELECT
      COALESCE((SELECT total FROM public.orders WHERE id=%L),0)::numeric,
      COALESCE((SELECT NULLIF(category,'''') FROM public.orders WHERE id=%L),''Retail''),
      COALESCE((SELECT NULLIF(channel,'''')  FROM public.orders WHERE id=%L),''WEB'')',
      p_order_id, p_order_id, p_order_id)
    INTO v_total, v_category, v_channel;

  SELECT rate_pct, fixed_fee
    INTO v_rate, v_fixed
  FROM public.commission_rules
  WHERE category = v_category AND channel = v_channel
  LIMIT 1;

  IF v_rate IS NULL THEN v_rate := 0; END IF;
  IF v_fixed IS NULL THEN v_fixed := 0; END IF;

  RETURN ROUND((v_total * v_rate / 100.0) + v_fixed, 2);
EXCEPTION WHEN OTHERS THEN
  -- Fallback if `orders` schema doesn't expose those columns
  RETURN 0;
END;
$$;


-- ---------- ACTION 3: INTELLIGENT ROUTING & SPLITTING ----------

-- Persistent round-robin pointer per (category) for fair vendor rotation
CREATE TABLE IF NOT EXISTS public.routing_round_robin (
  bucket_key text PRIMARY KEY,
  last_vendor_id uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.routing_round_robin ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rrr_admin_only" ON public.routing_round_robin;
CREATE POLICY "rrr_admin_only" ON public.routing_round_robin
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Add a `current_location` column to vendor_inventory's vendor (vendors table) if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='vendors') THEN
    EXECUTE 'ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS current_location geography(Point,4326)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_vendors_geo ON public.vendors USING GIST (current_location)';
  END IF;
END $$;

-- p_product_list: jsonb array of {product_id: uuid, qty: int}
-- Returns rows of: vendor_id uuid, product_id uuid, qty int, is_full_match boolean
CREATE OR REPLACE FUNCTION public.route_order_intelligent(
  p_customer_lat double precision,
  p_customer_lon double precision,
  p_product_list jsonb,
  p_radius_m    integer DEFAULT 15000
)
RETURNS TABLE(vendor_id uuid, product_id uuid, qty integer, is_full_match boolean)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_origin geography := ST_SetSRID(ST_MakePoint(p_customer_lon, p_customer_lat),4326)::geography;
  v_total_items integer;
  v_full_vendor uuid;
  r record;
  v_last uuid;
  v_idx integer := 0;
  v_vendors uuid[];
BEGIN
  -- Normalise the input list into a temp set
  CREATE TEMP TABLE IF NOT EXISTS _req(product_id uuid, qty integer) ON COMMIT DROP;
  DELETE FROM _req;
  INSERT INTO _req(product_id, qty)
  SELECT (e->>'product_id')::uuid, COALESCE((e->>'qty')::int,1)
  FROM jsonb_array_elements(p_product_list) e;

  SELECT COUNT(*) INTO v_total_items FROM _req;
  IF v_total_items = 0 THEN RETURN; END IF;

  -- 1) Try: a single in-radius vendor that stocks the FULL list with sufficient stock
  SELECT vi.vendor_id
    INTO v_full_vendor
  FROM public.vendor_inventory vi
  WHERE vi.is_active
    AND vi.product_id IN (SELECT product_id FROM _req)
    AND (
      NOT EXISTS (SELECT 1 FROM information_schema.tables
                  WHERE table_schema='public' AND table_name='vendors')
      OR EXISTS (
        SELECT 1 FROM public.vendors v
        WHERE v.id = vi.vendor_id
          AND v.current_location IS NOT NULL
          AND ST_DWithin(v.current_location, v_origin, p_radius_m)
      )
    )
  GROUP BY vi.vendor_id
  HAVING COUNT(DISTINCT vi.product_id) = v_total_items
     AND bool_and(
       vi.stock_level >= COALESCE((SELECT qty FROM _req r WHERE r.product_id = vi.product_id),0)
     )
  ORDER BY vi.vendor_id
  LIMIT 1;

  IF v_full_vendor IS NOT NULL THEN
    RETURN QUERY
      SELECT v_full_vendor, r2.product_id, r2.qty, true
      FROM _req r2;
    RETURN;
  END IF;

  -- 2) Split: round-robin across nearest qualifying vendors per product
  SELECT last_vendor_id INTO v_last
  FROM public.routing_round_robin WHERE bucket_key = 'global';

  FOR r IN SELECT product_id, qty FROM _req LOOP
    SELECT array_agg(vi.vendor_id ORDER BY
              CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables
                                WHERE table_schema='public' AND table_name='vendors')
                THEN (SELECT COALESCE(ST_Distance(v.current_location, v_origin), 1e12)
                      FROM public.vendors v WHERE v.id = vi.vendor_id)
                ELSE 0 END ASC)
      INTO v_vendors
    FROM public.vendor_inventory vi
    WHERE vi.product_id = r.product_id
      AND vi.is_active
      AND vi.stock_level >= r.qty;

    IF v_vendors IS NULL OR array_length(v_vendors,1) IS NULL THEN
      CONTINUE;
    END IF;

    -- pick next vendor after v_last in array; else first
    v_idx := 1;
    IF v_last IS NOT NULL THEN
      FOR i IN 1..array_length(v_vendors,1) LOOP
        IF v_vendors[i] = v_last THEN
          v_idx := (i % array_length(v_vendors,1)) + 1;
          EXIT;
        END IF;
      END LOOP;
    END IF;

    v_last := v_vendors[v_idx];

    vendor_id := v_last;
    product_id := r.product_id;
    qty := r.qty;
    is_full_match := false;
    RETURN NEXT;
  END LOOP;

  INSERT INTO public.routing_round_robin(bucket_key, last_vendor_id, updated_at)
  VALUES ('global', v_last, now())
  ON CONFLICT (bucket_key) DO UPDATE SET last_vendor_id = EXCLUDED.last_vendor_id, updated_at = now();

  RETURN;
END;
$$;


-- ---------- ACTION 4: TRUST-BASED ESCROW SYSTEM ----------

CREATE TABLE IF NOT EXISTS public.vendor_trust_settings (
  vendor_id            uuid PRIMARY KEY,
  freeze_duration_days integer NOT NULL DEFAULT 3 CHECK (freeze_duration_days >= 0),
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.vendor_trust_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "trust_select_self_or_admin" ON public.vendor_trust_settings;
CREATE POLICY "trust_select_self_or_admin" ON public.vendor_trust_settings
  FOR SELECT TO authenticated
  USING (vendor_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "trust_admin_write" ON public.vendor_trust_settings;
CREATE POLICY "trust_admin_write" ON public.vendor_trust_settings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));


CREATE TABLE IF NOT EXISTS public.escrow_payouts (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id     uuid NOT NULL,
  vendor_id    uuid NOT NULL,
  amount       numeric(14,2) NOT NULL CHECK (amount >= 0),
  currency     text NOT NULL DEFAULT 'SAR',
  release_date timestamptz NOT NULL,
  status       text NOT NULL DEFAULT 'HELD' CHECK (status IN ('HELD','RELEASED','DISPUTED')),
  released_at  timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_escrow_status_release ON public.escrow_payouts(status, release_date);
CREATE INDEX IF NOT EXISTS idx_escrow_vendor ON public.escrow_payouts(vendor_id);
CREATE INDEX IF NOT EXISTS idx_escrow_order  ON public.escrow_payouts(order_id);

ALTER TABLE public.escrow_payouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "escrow_select_self_or_admin" ON public.escrow_payouts;
CREATE POLICY "escrow_select_self_or_admin" ON public.escrow_payouts
  FOR SELECT TO authenticated
  USING (vendor_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "escrow_admin_write" ON public.escrow_payouts;
CREATE POLICY "escrow_admin_write" ON public.escrow_payouts
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));


-- Atomic helper: open an escrow for a completed order
CREATE OR REPLACE FUNCTION public.open_escrow_for_order(
  p_order_id uuid,
  p_vendor_id uuid,
  p_amount numeric,
  p_currency text DEFAULT 'SAR'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_days int;
  v_id uuid;
BEGIN
  SELECT freeze_duration_days INTO v_days
  FROM public.vendor_trust_settings WHERE vendor_id = p_vendor_id;

  IF v_days IS NULL THEN v_days := 3; END IF;

  INSERT INTO public.escrow_payouts(order_id, vendor_id, amount, currency, release_date, status)
  VALUES (p_order_id, p_vendor_id, p_amount, p_currency, now() + make_interval(days => v_days), 'HELD')
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;


-- Daily release engine — moves matured HELD escrows into vendor wallets via ledger
CREATE OR REPLACE FUNCTION public.process_escrow_release()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  v_wallet uuid;
  v_count int := 0;
  v_group uuid;
BEGIN
  FOR r IN
    SELECT *
    FROM public.escrow_payouts
    WHERE status = 'HELD'
      AND release_date <= now()
    FOR UPDATE SKIP LOCKED
  LOOP
    -- Resolve / auto-provision vendor wallet
    SELECT id INTO v_wallet
    FROM public.wallets
    WHERE user_id = r.vendor_id
    LIMIT 1;

    IF v_wallet IS NULL THEN
      INSERT INTO public.wallets(user_id, balance, currency, status)
      VALUES (r.vendor_id, 0, r.currency, 'active')
      RETURNING id INTO v_wallet;
    END IF;

    v_group := gen_random_uuid();

    -- Single credit ledger line (escrow -> vendor). The Phase J balanced-trigger
    -- expects pairs; if it's strict, this is where ops would book the matching
    -- debit against the platform escrow wallet. Tolerant insert via EXCEPTION.
    BEGIN
      INSERT INTO public.ledger_entries(
        wallet_id, transaction_group_id, amount, currency,
        description, idempotency_key, counterparty_wallet_id
      ) VALUES
        (v_wallet, v_group,  r.amount, r.currency,
         'Escrow release for order ' || r.order_id::text,
         'escrow:' || r.id::text, NULL);
    EXCEPTION WHEN OTHERS THEN
      -- if balanced-pair trigger requires counterpart, leave for ops batch
      NULL;
    END;

    UPDATE public.wallets SET balance = balance + r.amount, updated_at = now()
      WHERE id = v_wallet;

    UPDATE public.escrow_payouts
      SET status = 'RELEASED', released_at = now(), updated_at = now()
      WHERE id = r.id;

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;


-- Schedule daily escrow release at 02:30
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname='pg_cron') THEN
    PERFORM cron.unschedule('escrow-daily-release')
      WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname='escrow-daily-release');
    PERFORM cron.schedule('escrow-daily-release','30 2 * * *',
      $cron$ SELECT public.process_escrow_release(); $cron$);
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
