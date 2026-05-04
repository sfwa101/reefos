
-- ============================================================
-- 1. BALANCE INTEGRITY (CHECK constraint)
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'wallet_balances_non_negative'
  ) THEN
    ALTER TABLE public.wallet_balances
      ADD CONSTRAINT wallet_balances_non_negative CHECK (balance >= 0);
  END IF;
END$$;

-- ============================================================
-- 2. IDEMPOTENCY LEDGER FOR TRANSFERS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.wallet_transfer_idempotency (
  idempotency_key uuid PRIMARY KEY,
  sender_id uuid NOT NULL,
  recipient_id uuid NOT NULL,
  amount numeric NOT NULL,
  result jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.wallet_transfer_idempotency ENABLE ROW LEVEL SECURITY;

CREATE POLICY "no client access to idempotency ledger"
  ON public.wallet_transfer_idempotency
  FOR ALL TO authenticated
  USING (false) WITH CHECK (false);

-- ============================================================
-- 3. wallet_transfer_v2 with ordered locking + idempotency
-- ============================================================
CREATE OR REPLACE FUNCTION public.wallet_transfer_v2(
  _idempotency_key uuid,
  _recipient_phone text,
  _amount numeric,
  _note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender uuid := auth.uid();
  v_recipient uuid;
  v_first uuid;
  v_second uuid;
  v_existing jsonb;
  v_result jsonb;
BEGIN
  IF v_sender IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  IF _amount IS NULL OR _amount <= 0 THEN
    RAISE EXCEPTION 'invalid_amount';
  END IF;

  -- Idempotency check
  SELECT result INTO v_existing
  FROM public.wallet_transfer_idempotency
  WHERE idempotency_key = _idempotency_key;

  IF v_existing IS NOT NULL THEN
    RETURN v_existing;
  END IF;

  -- Resolve recipient
  SELECT id INTO v_recipient FROM public.profiles
  WHERE phone = _recipient_phone LIMIT 1;

  IF v_recipient IS NULL THEN
    RAISE EXCEPTION 'recipient_not_found';
  END IF;

  IF v_recipient = v_sender THEN
    RAISE EXCEPTION 'self_transfer';
  END IF;

  -- Deadlock-safe ordered locking: lock the smaller UUID first
  IF v_sender < v_recipient THEN
    v_first := v_sender; v_second := v_recipient;
  ELSE
    v_first := v_recipient; v_second := v_sender;
  END IF;

  PERFORM 1 FROM public.wallet_balances WHERE user_id = v_first FOR UPDATE;
  PERFORM 1 FROM public.wallet_balances WHERE user_id = v_second FOR UPDATE;

  -- Ensure rows exist
  INSERT INTO public.wallet_balances (user_id, balance)
    VALUES (v_recipient, 0)
    ON CONFLICT (user_id) DO NOTHING;

  -- Atomic debit (CHECK constraint enforces >= 0)
  UPDATE public.wallet_balances
    SET balance = balance - _amount
    WHERE user_id = v_sender;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'insufficient';
  END IF;

  -- Atomic credit
  UPDATE public.wallet_balances
    SET balance = balance + _amount
    WHERE user_id = v_recipient;

  -- Ledger entries
  INSERT INTO public.wallet_transactions (user_id, amount, kind, label, source)
    VALUES
    (v_sender, -_amount, 'transfer_out', COALESCE(_note, 'تحويل'), 'p2p'),
    (v_recipient, _amount, 'transfer_in', COALESCE(_note, 'تحويل وارد'), 'p2p');

  v_result := jsonb_build_object('ok', true, 'amount', _amount, 'recipient', v_recipient);

  INSERT INTO public.wallet_transfer_idempotency
    (idempotency_key, sender_id, recipient_id, amount, result)
    VALUES (_idempotency_key, v_sender, v_recipient, _amount, v_result);

  RETURN v_result;
END;
$$;

-- ============================================================
-- 4. GAM'EYAS (ROSCA) TABLES
-- ============================================================
DO $$ BEGIN
  CREATE TYPE public.gam_eya_status AS ENUM ('pending','active','completed','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.gam_eya_installment_status AS ENUM ('pending','paid','late','waived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.gam_eyas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  cycle_amount numeric NOT NULL CHECK (cycle_amount > 0),
  max_members int NOT NULL CHECK (max_members BETWEEN 2 AND 50),
  current_cycle_index int NOT NULL DEFAULT 0,
  status public.gam_eya_status NOT NULL DEFAULT 'pending',
  created_by uuid NOT NULL,
  starts_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.gam_eya_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gam_eya_id uuid NOT NULL REFERENCES public.gam_eyas(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  turn_number int NOT NULL,
  guarantor_id uuid,
  is_trusted boolean NOT NULL DEFAULT false,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (gam_eya_id, user_id),
  UNIQUE (gam_eya_id, turn_number)
);

CREATE TABLE IF NOT EXISTS public.gam_eya_installments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gam_eya_id uuid NOT NULL REFERENCES public.gam_eyas(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  cycle_index int NOT NULL,
  amount_due numeric NOT NULL CHECK (amount_due > 0),
  amount_paid numeric NOT NULL DEFAULT 0,
  due_date date NOT NULL,
  status public.gam_eya_installment_status NOT NULL DEFAULT 'pending',
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gam_members_user ON public.gam_eya_members(user_id);
CREATE INDEX IF NOT EXISTS idx_gam_inst_user ON public.gam_eya_installments(user_id, status);
CREATE INDEX IF NOT EXISTS idx_gam_inst_circle ON public.gam_eya_installments(gam_eya_id);

ALTER TABLE public.gam_eyas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gam_eya_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gam_eya_installments ENABLE ROW LEVEL SECURITY;

-- Helper: is the caller a member of this circle?
CREATE OR REPLACE FUNCTION public.is_gam_eya_member(_circle uuid, _user uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.gam_eya_members
    WHERE gam_eya_id = _circle AND user_id = _user
  );
$$;

CREATE POLICY "members read circles"
  ON public.gam_eyas FOR SELECT TO authenticated
  USING (public.is_gam_eya_member(id, auth.uid()) OR created_by = auth.uid());

CREATE POLICY "creator inserts circles"
  ON public.gam_eyas FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "creator updates circles"
  ON public.gam_eyas FOR UPDATE TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "members read members"
  ON public.gam_eya_members FOR SELECT TO authenticated
  USING (public.is_gam_eya_member(gam_eya_id, auth.uid()));

CREATE POLICY "self join member"
  ON public.gam_eya_members FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "members read own installments"
  ON public.gam_eya_installments FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_gam_eya_member(gam_eya_id, auth.uid()));

-- ============================================================
-- 5. MULTI-GOAL VAULTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.wallet_vaults (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  icon text,
  target_amount numeric CHECK (target_amount IS NULL OR target_amount > 0),
  current_balance numeric NOT NULL DEFAULT 0 CHECK (current_balance >= 0),
  locked_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vaults_user ON public.wallet_vaults(user_id);

ALTER TABLE public.wallet_vaults ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user reads own vaults"
  ON public.wallet_vaults FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "user creates own vaults"
  ON public.wallet_vaults FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "user updates own vaults"
  ON public.wallet_vaults FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "user deletes own vaults"
  ON public.wallet_vaults FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ============================================================
-- 6. updated_at triggers
-- ============================================================
DROP TRIGGER IF EXISTS trg_gam_eyas_updated ON public.gam_eyas;
CREATE TRIGGER trg_gam_eyas_updated BEFORE UPDATE ON public.gam_eyas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_vaults_updated ON public.wallet_vaults;
CREATE TRIGGER trg_vaults_updated BEFORE UPDATE ON public.wallet_vaults
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON COLUMN public.wallet_transactions.kind IS
  'transfer_in | transfer_out | gam_eya_deposit | gam_eya_payout | vault_deposit | vault_withdraw | topup | charity | cashback | points_redeem';
