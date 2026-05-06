
-- =====================================================================
-- PHASE R — SUPER-APP OS FABRIC & SMART COURTS
-- Idempotent.
-- =====================================================================

-- ---------- ACTION 1: MINI-PROGRAMS ----------
CREATE TABLE IF NOT EXISTS public.mini_programs (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                 text NOT NULL,
  manifest_url         text NOT NULL,
  version              text NOT NULL DEFAULT '1.0.0',
  required_permissions jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active            boolean NOT NULL DEFAULT true,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_mini_programs (
  user_id         uuid NOT NULL,
  mini_program_id uuid NOT NULL REFERENCES public.mini_programs(id) ON DELETE CASCADE,
  installed_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, mini_program_id)
);
CREATE INDEX IF NOT EXISTS idx_user_mini_programs_user ON public.user_mini_programs(user_id);

ALTER TABLE public.mini_programs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_mini_programs  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mp_read_active"        ON public.mini_programs;
CREATE POLICY "mp_read_active" ON public.mini_programs
  FOR SELECT TO authenticated
  USING (is_active = true OR public.has_role(auth.uid(),'admin'::public.app_role));

DROP POLICY IF EXISTS "mp_admin_write"        ON public.mini_programs;
CREATE POLICY "mp_admin_write" ON public.mini_programs
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::public.app_role));

DROP POLICY IF EXISTS "ump_select_self"  ON public.user_mini_programs;
CREATE POLICY "ump_select_self" ON public.user_mini_programs
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'::public.app_role));

DROP POLICY IF EXISTS "ump_insert_self"  ON public.user_mini_programs;
CREATE POLICY "ump_insert_self" ON public.user_mini_programs
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "ump_delete_self"  ON public.user_mini_programs;
CREATE POLICY "ump_delete_self" ON public.user_mini_programs
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ---------- ACTION 2: KYC VAULT ----------
CREATE TABLE IF NOT EXISTS public.kyc_documents (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL,
  document_type text NOT NULL CHECK (document_type IN ('NATIONAL_ID','PASSPORT','COMMERCIAL_REGISTER','TAX_CARD','BANK_STATEMENT')),
  document_hash text NOT NULL,
  status        text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','APPROVED','REJECTED')),
  verified_at   timestamptz,
  verified_by   uuid,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_kyc_user ON public.kyc_documents(user_id, status);

ALTER TABLE public.kyc_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "kyc_select_self_or_admin" ON public.kyc_documents;
CREATE POLICY "kyc_select_self_or_admin" ON public.kyc_documents
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'::public.app_role));

DROP POLICY IF EXISTS "kyc_insert_self" ON public.kyc_documents;
CREATE POLICY "kyc_insert_self" ON public.kyc_documents
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "kyc_admin_update" ON public.kyc_documents;
CREATE POLICY "kyc_admin_update" ON public.kyc_documents
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::public.app_role));

-- Required document set: NATIONAL_ID for individuals; vendors also need COMMERCIAL_REGISTER.
CREATE OR REPLACE FUNCTION public.check_kyc_status(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_required text[] := ARRAY['NATIONAL_ID'];
  v_is_vendor boolean := false;
  v_doc text;
BEGIN
  -- Detect vendor role if user_roles + app_role enum have 'vendor'
  BEGIN
    SELECT public.has_role(p_user_id, 'vendor'::public.app_role) INTO v_is_vendor;
  EXCEPTION WHEN others THEN
    v_is_vendor := false;
  END;

  IF v_is_vendor THEN
    v_required := v_required || ARRAY['COMMERCIAL_REGISTER'];
  END IF;

  FOREACH v_doc IN ARRAY v_required LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.kyc_documents
      WHERE user_id = p_user_id AND document_type = v_doc AND status = 'APPROVED'
    ) THEN
      RETURN false;
    END IF;
  END LOOP;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.check_kyc_status(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_kyc_status(uuid) TO authenticated, service_role;

-- ---------- ACTION 3: SMART COURTS / ESCROW DISPUTES ----------
CREATE TABLE IF NOT EXISTS public.escrow_disputes (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  escrow_id        uuid NOT NULL REFERENCES public.escrow_payouts(id) ON DELETE CASCADE,
  initiator_id     uuid NOT NULL,
  reason_text      text NOT NULL,
  status           text NOT NULL DEFAULT 'OPEN'
                     CHECK (status IN ('OPEN','RESOLVED_REFUND','RESOLVED_RELEASE')),
  resolution_notes text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  resolved_at      timestamptz
);
CREATE INDEX IF NOT EXISTS idx_escrow_disputes_escrow ON public.escrow_disputes(escrow_id);
CREATE INDEX IF NOT EXISTS idx_escrow_disputes_status ON public.escrow_disputes(status);

ALTER TABLE public.escrow_disputes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ed_select_party_or_admin" ON public.escrow_disputes;
CREATE POLICY "ed_select_party_or_admin" ON public.escrow_disputes
  FOR SELECT TO authenticated
  USING (
    initiator_id = auth.uid()
    OR public.has_role(auth.uid(),'admin'::public.app_role)
  );

DROP POLICY IF EXISTS "ed_insert_self" ON public.escrow_disputes;
CREATE POLICY "ed_insert_self" ON public.escrow_disputes
  FOR INSERT TO authenticated
  WITH CHECK (initiator_id = auth.uid());

DROP POLICY IF EXISTS "ed_admin_update" ON public.escrow_disputes;
CREATE POLICY "ed_admin_update" ON public.escrow_disputes
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::public.app_role));

-- Trigger: lock the related escrow payout immediately
CREATE OR REPLACE FUNCTION public.tg_escrow_dispute_lock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.escrow_payouts
     SET status = 'DISPUTED'
   WHERE id = NEW.escrow_id
     AND status = 'HELD';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_escrow_dispute_lock ON public.escrow_disputes;
CREATE TRIGGER trg_escrow_dispute_lock
  AFTER INSERT ON public.escrow_disputes
  FOR EACH ROW EXECUTE FUNCTION public.tg_escrow_dispute_lock();
