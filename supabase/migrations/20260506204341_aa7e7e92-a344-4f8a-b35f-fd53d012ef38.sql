
CREATE OR REPLACE FUNCTION public._resolve_wallet(p_user_id uuid, p_currency text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_wallet_id uuid;
BEGIN
  SELECT id INTO v_wallet_id FROM public.wallets
   WHERE user_id = p_user_id AND currency = p_currency AND status = 'active' LIMIT 1;
  IF v_wallet_id IS NULL THEN
    INSERT INTO public.wallets (user_id, currency, balance, status)
    VALUES (p_user_id, p_currency, 0, 'active') RETURNING id INTO v_wallet_id;
  END IF;
  RETURN v_wallet_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.process_trade_settlement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_buyer_id        uuid;
  v_seller_id       uuid;
  v_taker_order     public.order_book%ROWTYPE;
  v_maker_order     public.order_book%ROWTYPE;
  v_security_symbol text;
  v_quote_currency  text := 'EGP';
  v_funds_total     numeric;
  v_buyer_funds_w   uuid;
  v_seller_funds_w  uuid;
  v_buyer_asset_w   uuid;
  v_seller_asset_w  uuid;
  v_group           uuid := NEW.id;
BEGIN
  SELECT * INTO v_taker_order FROM public.order_book WHERE id = NEW.taker_order_id;
  SELECT * INTO v_maker_order FROM public.order_book WHERE id = NEW.maker_order_id;

  IF v_taker_order.side = 'BUY' THEN
    v_buyer_id  := v_taker_order.user_id;
    v_seller_id := v_maker_order.user_id;
  ELSE
    v_buyer_id  := v_maker_order.user_id;
    v_seller_id := v_taker_order.user_id;
  END IF;

  SELECT symbol INTO v_security_symbol FROM public.securities WHERE id = NEW.security_id;
  IF v_security_symbol IS NULL THEN
    v_security_symbol := NEW.security_id::text;
  END IF;

  v_funds_total := NEW.price * NEW.amount;

  v_buyer_funds_w  := public._resolve_wallet(v_buyer_id,  v_quote_currency);
  v_seller_funds_w := public._resolve_wallet(v_seller_id, v_quote_currency);
  v_buyer_asset_w  := public._resolve_wallet(v_buyer_id,  v_security_symbol);
  v_seller_asset_w := public._resolve_wallet(v_seller_id, v_security_symbol);

  IF (SELECT balance FROM public.wallets WHERE id = v_buyer_funds_w FOR UPDATE) < v_funds_total THEN
    RAISE EXCEPTION 'SETTLEMENT_FAILED: buyer % has insufficient funds', v_buyer_id;
  END IF;
  IF (SELECT balance FROM public.wallets WHERE id = v_seller_asset_w FOR UPDATE) < NEW.amount THEN
    RAISE EXCEPTION 'SETTLEMENT_FAILED: seller % has insufficient assets of %', v_seller_id, v_security_symbol;
  END IF;

  UPDATE public.wallets SET balance = balance - v_funds_total WHERE id = v_buyer_funds_w;
  UPDATE public.wallets SET balance = balance + v_funds_total WHERE id = v_seller_funds_w;
  UPDATE public.wallets SET balance = balance - NEW.amount    WHERE id = v_seller_asset_w;
  UPDATE public.wallets SET balance = balance + NEW.amount    WHERE id = v_buyer_asset_w;

  INSERT INTO public.ledger_entries
    (wallet_id, transaction_group_id, amount, currency, description, idempotency_key, counterparty_wallet_id)
  VALUES
    (v_buyer_funds_w,  v_group, -v_funds_total, v_quote_currency,
     'DEX trade '||NEW.id||' funds debit',  'trade:'||NEW.id||':funds:debit',  v_seller_funds_w),
    (v_seller_funds_w, v_group,  v_funds_total, v_quote_currency,
     'DEX trade '||NEW.id||' funds credit', 'trade:'||NEW.id||':funds:credit', v_buyer_funds_w),
    (v_seller_asset_w, v_group, -NEW.amount, v_security_symbol,
     'DEX trade '||NEW.id||' asset debit',  'trade:'||NEW.id||':asset:debit',  v_buyer_asset_w),
    (v_buyer_asset_w,  v_group,  NEW.amount, v_security_symbol,
     'DEX trade '||NEW.id||' asset credit', 'trade:'||NEW.id||':asset:credit', v_seller_asset_w);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_process_trade_settlement ON public.trades;
CREATE TRIGGER trg_process_trade_settlement
  AFTER INSERT ON public.trades
  FOR EACH ROW EXECUTE FUNCTION public.process_trade_settlement();

-- ACTION 2: DEX AUTO-IGNITION
CREATE OR REPLACE FUNCTION public.trg_order_auto_match()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'OPEN' THEN
    PERFORM public.execute_trade_matching(NEW.security_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_order_book_auto_match ON public.order_book;
CREATE TRIGGER trg_order_book_auto_match
  AFTER INSERT ON public.order_book
  FOR EACH ROW EXECUTE FUNCTION public.trg_order_auto_match();

-- ACTION 3: DRIVER TELEMETRY RPC
CREATE OR REPLACE FUNCTION public.update_driver_location(
  p_lat double precision,
  p_lon double precision
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_rows int;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  UPDATE public.drivers
     SET current_location = ST_SetSRID(ST_MakePoint(p_lon, p_lat), 4326)::geography,
         updated_at = now()
   WHERE user_id = v_uid;

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN
    RAISE EXCEPTION 'NOT_A_DRIVER: no driver row owned by %', v_uid;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.update_driver_location(double precision, double precision) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_driver_location(double precision, double precision) TO authenticated;
