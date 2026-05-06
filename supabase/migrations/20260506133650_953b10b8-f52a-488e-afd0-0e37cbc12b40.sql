
-- =========================================================
-- PHASE C: TAYSEER FINANCE ENGINE
-- =========================================================

-- ---------- ACTION 1: PRICE ORACLES ----------
CREATE TABLE public.price_oracles (
  symbol      varchar(16) PRIMARY KEY,
  price_usd   numeric(24,8) NOT NULL CHECK (price_usd >= 0),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.oracle_price_history (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol      varchar(16) NOT NULL,
  price_usd   numeric(24,8) NOT NULL CHECK (price_usd >= 0),
  recorded_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_oracle_history_symbol_time
  ON public.oracle_price_history (symbol, recorded_at DESC);

ALTER TABLE public.price_oracles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oracle_price_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "oracles_read_authenticated"
  ON public.price_oracles FOR SELECT TO authenticated USING (true);
CREATE POLICY "oracles_admin_write"
  ON public.price_oracles FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "oracle_history_read_authenticated"
  ON public.oracle_price_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "oracle_history_admin_write"
  ON public.oracle_price_history FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ---------- ACTION 2: SME MICRO-EXCHANGE ----------
CREATE TABLE public.securities (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol        varchar(16) NOT NULL UNIQUE,
  company_name  text NOT NULL,
  total_supply  numeric(28,8) NOT NULL CHECK (total_supply >= 0),
  status        text NOT NULL DEFAULT 'active'
                 CHECK (status IN ('active','suspended','delisted')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER securities_updated_at
  BEFORE UPDATE ON public.securities
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE public.security_holdings (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id   uuid NOT NULL REFERENCES public.wallets(id) ON DELETE RESTRICT,
  security_id uuid NOT NULL REFERENCES public.securities(id) ON DELETE RESTRICT,
  amount      numeric(28,8) NOT NULL DEFAULT 0 CHECK (amount >= 0),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (wallet_id, security_id)
);
CREATE TRIGGER security_holdings_updated_at
  BEFORE UPDATE ON public.security_holdings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE public.order_book (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  security_id    uuid NOT NULL REFERENCES public.securities(id) ON DELETE RESTRICT,
  wallet_id      uuid NOT NULL REFERENCES public.wallets(id) ON DELETE RESTRICT,
  side           text NOT NULL CHECK (side IN ('BUY','SELL')),
  price          numeric(24,8) NOT NULL CHECK (price > 0),
  amount         numeric(28,8) NOT NULL CHECK (amount > 0),
  filled_amount  numeric(28,8) NOT NULL DEFAULT 0 CHECK (filled_amount >= 0),
  status         text NOT NULL DEFAULT 'OPEN'
                  CHECK (status IN ('OPEN','PARTIAL','FILLED','CANCELLED')),
  created_at     timestamptz NOT NULL DEFAULT now(),
  CHECK (filled_amount <= amount)
);
CREATE INDEX idx_order_book_match
  ON public.order_book (security_id, side, price, created_at)
  WHERE status IN ('OPEN','PARTIAL');
CREATE INDEX idx_order_book_wallet ON public.order_book (wallet_id);

CREATE TABLE public.trades (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  maker_order_id  uuid NOT NULL REFERENCES public.order_book(id) ON DELETE RESTRICT,
  taker_order_id  uuid NOT NULL REFERENCES public.order_book(id) ON DELETE RESTRICT,
  security_id     uuid NOT NULL REFERENCES public.securities(id) ON DELETE RESTRICT,
  execute_price   numeric(24,8) NOT NULL CHECK (execute_price > 0),
  execute_amount  numeric(28,8) NOT NULL CHECK (execute_amount > 0),
  executed_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_trades_security_time ON public.trades (security_id, executed_at DESC);

-- RLS
ALTER TABLE public.securities         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_holdings  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_book         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades             ENABLE ROW LEVEL SECURITY;

-- securities: readable by all authenticated; admin manages
CREATE POLICY "securities_read" ON public.securities
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "securities_admin_write" ON public.securities
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- holdings: owner read, admin all; writes via RPC only (no direct insert/update)
CREATE POLICY "holdings_owner_read" ON public.security_holdings
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (SELECT 1 FROM public.wallets w
               WHERE w.id = security_holdings.wallet_id AND w.user_id = auth.uid())
  );
CREATE POLICY "holdings_no_direct_write" ON public.security_holdings
  FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- order_book: owner sees own, admin sees all; no direct writes (use RPC)
CREATE POLICY "order_book_owner_read" ON public.order_book
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (SELECT 1 FROM public.wallets w
               WHERE w.id = order_book.wallet_id AND w.user_id = auth.uid())
  );
CREATE POLICY "order_book_no_direct_write" ON public.order_book
  FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- trades: visible if user owns either side, admin sees all
CREATE POLICY "trades_participant_read" ON public.trades
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.order_book o
      JOIN public.wallets w ON w.id = o.wallet_id
      WHERE (o.id = trades.maker_order_id OR o.id = trades.taker_order_id)
        AND w.user_id = auth.uid()
    )
  );
CREATE POLICY "trades_no_direct_write" ON public.trades
  FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- ---------- ACTION 3: ATOMIC ORDER PLACEMENT RPC ----------
CREATE OR REPLACE FUNCTION public.tayseer_place_limit_order(
  p_wallet_id   uuid,
  p_security_id uuid,
  p_side        text,
  p_price       numeric,
  p_amount      numeric
)
RETURNS public.order_book
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid       uuid := auth.uid();
  v_wallet    public.wallets%ROWTYPE;
  v_security  public.securities%ROWTYPE;
  v_required  numeric;
  v_holding   numeric;
  v_order     public.order_book%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '28000';
  END IF;
  IF p_side NOT IN ('BUY','SELL') THEN
    RAISE EXCEPTION 'invalid side: %', p_side USING ERRCODE = '22023';
  END IF;
  IF p_price IS NULL OR p_price <= 0 OR p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'price and amount must be positive' USING ERRCODE = '22023';
  END IF;

  -- Lock the wallet row to prevent concurrent double-spend
  SELECT * INTO v_wallet
    FROM public.wallets
   WHERE id = p_wallet_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'wallet not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_wallet.user_id <> v_uid AND NOT has_role(v_uid, 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden: wallet does not belong to caller' USING ERRCODE = '42501';
  END IF;
  IF v_wallet.status <> 'active' THEN
    RAISE EXCEPTION 'wallet is not active (status=%)', v_wallet.status USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_security FROM public.securities WHERE id = p_security_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'security not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_security.status <> 'active' THEN
    RAISE EXCEPTION 'security is not tradeable (status=%)', v_security.status USING ERRCODE = '22023';
  END IF;

  IF p_side = 'BUY' THEN
    v_required := p_price * p_amount;
    IF v_wallet.balance < v_required THEN
      RAISE EXCEPTION 'insufficient fiat balance: have %, need %',
        v_wallet.balance, v_required USING ERRCODE = '22023';
    END IF;
  ELSE
    SELECT COALESCE(amount, 0) INTO v_holding
      FROM public.security_holdings
     WHERE wallet_id = p_wallet_id AND security_id = p_security_id
     FOR UPDATE;
    IF v_holding IS NULL OR v_holding < p_amount THEN
      RAISE EXCEPTION 'insufficient security holdings: have %, need %',
        COALESCE(v_holding,0), p_amount USING ERRCODE = '22023';
    END IF;
  END IF;

  INSERT INTO public.order_book
    (security_id, wallet_id, side, price, amount, filled_amount, status)
  VALUES
    (p_security_id, p_wallet_id, p_side, p_price, p_amount, 0, 'OPEN')
  RETURNING * INTO v_order;

  RETURN v_order;
END;
$$;

REVOKE ALL ON FUNCTION public.tayseer_place_limit_order(uuid,uuid,text,numeric,numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.tayseer_place_limit_order(uuid,uuid,text,numeric,numeric) TO authenticated;
