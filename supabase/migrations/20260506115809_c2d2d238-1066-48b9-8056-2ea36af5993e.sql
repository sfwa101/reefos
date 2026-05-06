
-- =========================================================
-- TAYSEER LEDGER v1 — Double-Entry Financial Engine
-- =========================================================

-- 1. WALLETS ----------------------------------------------
CREATE TABLE IF NOT EXISTS public.wallets (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL,
  balance         numeric(18,4) NOT NULL DEFAULT 0,
  currency        text NOT NULL DEFAULT 'EGP',
  status          text NOT NULL DEFAULT 'active',  -- active | frozen | closed
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT wallets_status_chk CHECK (status IN ('active','frozen','closed')),
  CONSTRAINT wallets_balance_nonneg CHECK (balance >= 0),
  CONSTRAINT wallets_user_currency_uniq UNIQUE (user_id, currency)
);

CREATE INDEX IF NOT EXISTS idx_wallets_user ON public.wallets(user_id);

ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS wallets_owner_read ON public.wallets;
CREATE POLICY wallets_owner_read ON public.wallets
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

-- writes are FORBIDDEN through the API (use RPC only)
DROP POLICY IF EXISTS wallets_no_direct_write ON public.wallets;
CREATE POLICY wallets_no_direct_write ON public.wallets
  FOR ALL TO authenticated USING (false) WITH CHECK (false);

DROP TRIGGER IF EXISTS wallets_updated_at ON public.wallets;
CREATE TRIGGER wallets_updated_at
  BEFORE UPDATE ON public.wallets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. LEDGER ENTRIES (append-only) -------------------------
CREATE TABLE IF NOT EXISTS public.ledger_entries (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id             uuid NOT NULL REFERENCES public.wallets(id) ON DELETE RESTRICT,
  transaction_group_id  uuid NOT NULL,
  amount                numeric(18,4) NOT NULL,  -- + credit, − debit
  currency              text NOT NULL,
  description           text,
  idempotency_key       text NOT NULL,
  counterparty_wallet_id uuid REFERENCES public.wallets(id) ON DELETE SET NULL,
  created_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ledger_entries_idempotency_uniq UNIQUE (idempotency_key, wallet_id),
  CONSTRAINT ledger_entries_amount_nonzero  CHECK (amount <> 0)
);

CREATE INDEX IF NOT EXISTS idx_ledger_wallet_created
  ON public.ledger_entries(wallet_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ledger_group
  ON public.ledger_entries(transaction_group_id);
CREATE INDEX IF NOT EXISTS idx_ledger_created
  ON public.ledger_entries(created_at DESC);

ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ledger_owner_read ON public.ledger_entries;
CREATE POLICY ledger_owner_read ON public.ledger_entries
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.wallets w
      WHERE w.id = ledger_entries.wallet_id AND w.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS ledger_no_direct_write ON public.ledger_entries;
CREATE POLICY ledger_no_direct_write ON public.ledger_entries
  FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- 3. ATOMIC TRANSFER RPC ---------------------------------
CREATE OR REPLACE FUNCTION public.tayseer_transfer_funds(
  sender_wallet_id      uuid,
  receiver_wallet_id    uuid,
  transfer_amount       numeric,
  transfer_currency     text,
  idempotency_key       text,
  transfer_description  text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_group_id      uuid := gen_random_uuid();
  v_sender        public.wallets;
  v_receiver      public.wallets;
  v_existing      uuid;
BEGIN
  -- Guards
  IF transfer_amount IS NULL OR transfer_amount <= 0 THEN
    RAISE EXCEPTION 'transfer_amount must be > 0' USING ERRCODE = '22023';
  END IF;
  IF sender_wallet_id = receiver_wallet_id THEN
    RAISE EXCEPTION 'sender and receiver must differ' USING ERRCODE = '22023';
  END IF;
  IF idempotency_key IS NULL OR length(idempotency_key) < 8 THEN
    RAISE EXCEPTION 'idempotency_key required (min 8 chars)' USING ERRCODE = '22023';
  END IF;

  -- Idempotency: if a debit already exists for this key+sender, return its group id
  SELECT transaction_group_id INTO v_existing
  FROM public.ledger_entries
  WHERE idempotency_key = tayseer_transfer_funds.idempotency_key
    AND wallet_id = sender_wallet_id
  LIMIT 1;
  IF v_existing IS NOT NULL THEN
    RETURN v_existing;
  END IF;

  -- Lock both wallets in a deterministic order to prevent deadlocks
  IF sender_wallet_id < receiver_wallet_id THEN
    SELECT * INTO v_sender   FROM public.wallets WHERE id = sender_wallet_id   FOR UPDATE;
    SELECT * INTO v_receiver FROM public.wallets WHERE id = receiver_wallet_id FOR UPDATE;
  ELSE
    SELECT * INTO v_receiver FROM public.wallets WHERE id = receiver_wallet_id FOR UPDATE;
    SELECT * INTO v_sender   FROM public.wallets WHERE id = sender_wallet_id   FOR UPDATE;
  END IF;

  IF v_sender.id IS NULL OR v_receiver.id IS NULL THEN
    RAISE EXCEPTION 'wallet not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_sender.status <> 'active' OR v_receiver.status <> 'active' THEN
    RAISE EXCEPTION 'wallet not active' USING ERRCODE = '23514';
  END IF;
  IF v_sender.currency <> transfer_currency OR v_receiver.currency <> transfer_currency THEN
    RAISE EXCEPTION 'currency mismatch' USING ERRCODE = '22023';
  END IF;
  IF v_sender.balance < transfer_amount THEN
    RAISE EXCEPTION 'insufficient funds' USING ERRCODE = 'P0001';
  END IF;

  -- Apply balances
  UPDATE public.wallets SET balance = balance - transfer_amount WHERE id = sender_wallet_id;
  UPDATE public.wallets SET balance = balance + transfer_amount WHERE id = receiver_wallet_id;

  -- Double-entry pair
  INSERT INTO public.ledger_entries
    (wallet_id, transaction_group_id, amount, currency, description, idempotency_key, counterparty_wallet_id)
  VALUES
    (sender_wallet_id,   v_group_id, -transfer_amount, transfer_currency, transfer_description, idempotency_key, receiver_wallet_id),
    (receiver_wallet_id, v_group_id,  transfer_amount, transfer_currency, transfer_description, idempotency_key, sender_wallet_id);

  RETURN v_group_id;
END;
$$;

REVOKE ALL ON FUNCTION public.tayseer_transfer_funds(uuid,uuid,numeric,text,text,text) FROM public;
GRANT EXECUTE ON FUNCTION public.tayseer_transfer_funds(uuid,uuid,numeric,text,text,text) TO authenticated;
