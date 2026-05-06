
-- =========================================================
-- PHASE K — MOTION, SPATIAL RADAR & TAYSEER iDEX
-- =========================================================

-- ----- ACTION 1: THE CLOCKMAKER -----
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Unschedule prior version if exists (idempotent)
DO $$
BEGIN
  PERFORM cron.unschedule('subscription-pulse')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'subscription-pulse');
EXCEPTION WHEN OTHERS THEN NULL;
END$$;

SELECT cron.schedule(
  'subscription-pulse',
  '0 * * * *',
  $$SELECT public.process_due_subscriptions()$$
);

-- ----- ACTION 2: MRSOOL SPATIAL RADAR -----
CREATE EXTENSION IF NOT EXISTS postgis;

ALTER TABLE public.drivers
  ADD COLUMN IF NOT EXISTS current_location geography(Point, 4326);

CREATE INDEX IF NOT EXISTS idx_drivers_current_location_gist
  ON public.drivers USING GIST (current_location);

CREATE OR REPLACE FUNCTION public.find_nearest_drivers(
  p_lat double precision,
  p_lon double precision,
  p_radius_meters double precision
)
RETURNS TABLE (
  driver_id uuid,
  distance_meters double precision,
  current_location geography
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    d.id AS driver_id,
    ST_Distance(d.current_location, ST_SetSRID(ST_MakePoint(p_lon, p_lat), 4326)::geography) AS distance_meters,
    d.current_location
  FROM public.drivers d
  WHERE d.current_location IS NOT NULL
    AND ST_DWithin(
      d.current_location,
      ST_SetSRID(ST_MakePoint(p_lon, p_lat), 4326)::geography,
      p_radius_meters
    )
  ORDER BY d.current_location <-> ST_SetSRID(ST_MakePoint(p_lon, p_lat), 4326)::geography
  LIMIT 50;
$$;

-- ----- ACTION 3: TAYSEER INTERNAL DEX -----

CREATE TABLE IF NOT EXISTS public.trades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  security_id text NOT NULL,
  maker_order_id uuid NOT NULL,
  taker_order_id uuid NOT NULL,
  price numeric(20,8) NOT NULL CHECK (price > 0),
  amount numeric(20,8) NOT NULL CHECK (amount > 0),
  executed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trades_security_executed
  ON public.trades (security_id, executed_at DESC);

ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='trades' AND policyname='trades_admin_read') THEN
    CREATE POLICY trades_admin_read ON public.trades
      FOR SELECT
      TO authenticated
      USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END$$;

CREATE OR REPLACE FUNCTION public.execute_trade_matching(p_security_id text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bid record;
  v_ask record;
  v_match_qty numeric(20,8);
  v_match_price numeric(20,8);
  v_trades_created integer := 0;
BEGIN
  -- Lock all active orders for this security so concurrent matchers cannot interfere
  PERFORM 1
  FROM public.order_book
  WHERE security_id = p_security_id
    AND status IN ('OPEN','PARTIAL')
  ORDER BY id
  FOR UPDATE;

  LOOP
    -- Highest BID
    SELECT *
      INTO v_bid
    FROM public.order_book
    WHERE security_id = p_security_id
      AND side = 'BUY'
      AND status IN ('OPEN','PARTIAL')
      AND (amount - COALESCE(filled_amount,0)) > 0
    ORDER BY price DESC, created_at ASC
    LIMIT 1;

    -- Lowest ASK
    SELECT *
      INTO v_ask
    FROM public.order_book
    WHERE security_id = p_security_id
      AND side = 'SELL'
      AND status IN ('OPEN','PARTIAL')
      AND (amount - COALESCE(filled_amount,0)) > 0
    ORDER BY price ASC, created_at ASC
    LIMIT 1;

    -- No crossing → done
    IF v_bid IS NULL OR v_ask IS NULL THEN EXIT; END IF;
    IF v_bid.price < v_ask.price THEN EXIT; END IF;

    -- Maker = older order, taker = newer; price = maker price
    IF v_bid.created_at <= v_ask.created_at THEN
      v_match_price := v_bid.price;
    ELSE
      v_match_price := v_ask.price;
    END IF;

    v_match_qty := LEAST(
      v_bid.amount  - COALESCE(v_bid.filled_amount,0),
      v_ask.amount  - COALESCE(v_ask.filled_amount,0)
    );

    IF v_match_qty <= 0 THEN EXIT; END IF;

    -- Update BID
    UPDATE public.order_book
       SET filled_amount = COALESCE(filled_amount,0) + v_match_qty,
           status = CASE
             WHEN COALESCE(filled_amount,0) + v_match_qty >= amount THEN 'FILLED'
             ELSE 'PARTIAL'
           END,
           updated_at = now()
     WHERE id = v_bid.id;

    -- Update ASK
    UPDATE public.order_book
       SET filled_amount = COALESCE(filled_amount,0) + v_match_qty,
           status = CASE
             WHEN COALESCE(filled_amount,0) + v_match_qty >= amount THEN 'FILLED'
             ELSE 'PARTIAL'
           END,
           updated_at = now()
     WHERE id = v_ask.id;

    -- Record trade
    INSERT INTO public.trades (security_id, maker_order_id, taker_order_id, price, amount)
    VALUES (
      p_security_id,
      CASE WHEN v_bid.created_at <= v_ask.created_at THEN v_bid.id ELSE v_ask.id END,
      CASE WHEN v_bid.created_at <= v_ask.created_at THEN v_ask.id ELSE v_bid.id END,
      v_match_price,
      v_match_qty
    );

    v_trades_created := v_trades_created + 1;
  END LOOP;

  RETURN v_trades_created;
END;
$$;
