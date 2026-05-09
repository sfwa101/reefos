-- ============================================================
-- PHASE 61 — SOVEREIGN FAMILY GRAPH, WALLET LIMITS, SHARED VAULTS
-- Stem-cell, additive, RLS-first.
-- ============================================================

-- 1) FAMILY GROUPS ------------------------------------------------
CREATE TABLE public.tayseer_family_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.tayseer_family_members (
  group_id UUID NOT NULL REFERENCES public.tayseer_family_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('head','admin','spouse','child','dependent')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, user_id)
);
CREATE INDEX idx_tayseer_family_members_user ON public.tayseer_family_members(user_id);

-- SECURITY DEFINER helpers (avoid RLS recursion) ------------------
CREATE OR REPLACE FUNCTION public.is_family_member(p_group_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tayseer_family_members
    WHERE group_id = p_group_id AND user_id = p_user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.has_family_role(p_group_id UUID, p_user_id UUID, p_roles TEXT[])
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tayseer_family_members
    WHERE group_id = p_group_id AND user_id = p_user_id AND role = ANY(p_roles)
  );
$$;

-- Auto-bootstrap creator as 'head' on group insert
CREATE OR REPLACE FUNCTION public.tayseer_family_bootstrap_head()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.tayseer_family_members(group_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'head')
  ON CONFLICT (group_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_tayseer_family_bootstrap
AFTER INSERT ON public.tayseer_family_groups
FOR EACH ROW EXECUTE FUNCTION public.tayseer_family_bootstrap_head();

CREATE TRIGGER trg_tayseer_family_groups_updated
BEFORE UPDATE ON public.tayseer_family_groups
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS: family groups & members
ALTER TABLE public.tayseer_family_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tayseer_family_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "family: members read group"
  ON public.tayseer_family_groups FOR SELECT TO authenticated
  USING (public.is_family_member(id, auth.uid()) OR created_by = auth.uid());

CREATE POLICY "family: anyone authed creates group"
  ON public.tayseer_family_groups FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "family: head/admin updates group"
  ON public.tayseer_family_groups FOR UPDATE TO authenticated
  USING (public.has_family_role(id, auth.uid(), ARRAY['head','admin']));

CREATE POLICY "family: head deletes group"
  ON public.tayseer_family_groups FOR DELETE TO authenticated
  USING (public.has_family_role(id, auth.uid(), ARRAY['head']));

CREATE POLICY "family: members read roster"
  ON public.tayseer_family_members FOR SELECT TO authenticated
  USING (public.is_family_member(group_id, auth.uid()));

CREATE POLICY "family: head/admin invites members"
  ON public.tayseer_family_members FOR INSERT TO authenticated
  WITH CHECK (public.has_family_role(group_id, auth.uid(), ARRAY['head','admin']));

CREATE POLICY "family: head/admin updates members"
  ON public.tayseer_family_members FOR UPDATE TO authenticated
  USING (public.has_family_role(group_id, auth.uid(), ARRAY['head','admin']));

CREATE POLICY "family: head/admin removes members or self-leave"
  ON public.tayseer_family_members FOR DELETE TO authenticated
  USING (
    public.has_family_role(group_id, auth.uid(), ARRAY['head','admin'])
    OR user_id = auth.uid()
  );

-- 2) WALLET LIMITS ------------------------------------------------
CREATE TABLE public.tayseer_wallet_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
  set_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period TEXT NOT NULL CHECK (period IN ('daily','weekly','monthly')),
  max_amount NUMERIC NOT NULL CHECK (max_amount > 0),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (wallet_id, period)
);
CREATE INDEX idx_tayseer_wallet_limits_wallet ON public.tayseer_wallet_limits(wallet_id) WHERE active;

CREATE TRIGGER trg_tayseer_wallet_limits_updated
BEFORE UPDATE ON public.tayseer_wallet_limits
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Period-window debit-sum + cap check
CREATE OR REPLACE FUNCTION public.check_wallet_limit(p_wallet_id UUID, p_amount NUMERIC)
RETURNS VOID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  v_window_start TIMESTAMPTZ;
  v_spent NUMERIC;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN;
  END IF;

  FOR r IN
    SELECT period, max_amount
    FROM public.tayseer_wallet_limits
    WHERE wallet_id = p_wallet_id AND active = true
  LOOP
    v_window_start := CASE r.period
      WHEN 'daily'   THEN date_trunc('day',   now())
      WHEN 'weekly'  THEN date_trunc('week',  now())
      WHEN 'monthly' THEN date_trunc('month', now())
    END;

    -- Debits on the ledger are negative; sum absolute value.
    SELECT COALESCE(SUM(-amount), 0) INTO v_spent
    FROM public.ledger_entries
    WHERE wallet_id = p_wallet_id
      AND amount < 0
      AND created_at >= v_window_start;

    IF v_spent + p_amount > r.max_amount THEN
      RAISE EXCEPTION 'limit_exceeded:%:%:%', r.period, r.max_amount, v_spent
        USING ERRCODE = 'check_violation';
    END IF;
  END LOOP;
END;
$$;

ALTER TABLE public.tayseer_wallet_limits ENABLE ROW LEVEL SECURITY;

-- Wallet owner can see their own limits; setter can see what they set.
CREATE POLICY "limits: owner or setter reads"
  ON public.tayseer_wallet_limits FOR SELECT TO authenticated
  USING (
    set_by = auth.uid()
    OR EXISTS (SELECT 1 FROM public.wallets w WHERE w.id = wallet_id AND w.user_id = auth.uid())
  );

-- Only the setter (guardian) inserts; must be a 'head'/'admin' in some
-- family group containing the wallet's owner. We resolve ownership via
-- a SECURITY DEFINER predicate to avoid leaking wallets.
CREATE OR REPLACE FUNCTION public.can_set_wallet_limit(p_wallet_id UUID, p_setter UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.wallets w
    WHERE w.id = p_wallet_id
      AND (
        w.user_id = p_setter  -- self-imposed cap
        OR EXISTS (
          SELECT 1
          FROM public.tayseer_family_members fm_owner
          JOIN public.tayseer_family_members fm_setter
            ON fm_setter.group_id = fm_owner.group_id
          WHERE fm_owner.user_id = w.user_id
            AND fm_setter.user_id = p_setter
            AND fm_setter.role IN ('head','admin')
        )
      )
  );
$$;

CREATE POLICY "limits: guardian/self inserts"
  ON public.tayseer_wallet_limits FOR INSERT TO authenticated
  WITH CHECK (set_by = auth.uid() AND public.can_set_wallet_limit(wallet_id, auth.uid()));

CREATE POLICY "limits: guardian/self updates"
  ON public.tayseer_wallet_limits FOR UPDATE TO authenticated
  USING (set_by = auth.uid() AND public.can_set_wallet_limit(wallet_id, auth.uid()));

CREATE POLICY "limits: guardian/self deletes"
  ON public.tayseer_wallet_limits FOR DELETE TO authenticated
  USING (set_by = auth.uid() AND public.can_set_wallet_limit(wallet_id, auth.uid()));

-- 3) SHARED VAULTS ------------------------------------------------
CREATE TABLE public.tayseer_shared_vaults (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES public.tayseer_family_groups(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  target_amount NUMERIC CHECK (target_amount IS NULL OR target_amount > 0),
  current_balance NUMERIC NOT NULL DEFAULT 0 CHECK (current_balance >= 0),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','locked','closed')),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_tayseer_shared_vaults_group ON public.tayseer_shared_vaults(group_id);

CREATE TABLE public.tayseer_shared_vault_members (
  vault_id UUID NOT NULL REFERENCES public.tayseer_shared_vaults(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner','contributor','viewer')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (vault_id, user_id)
);
CREATE INDEX idx_tayseer_shared_vault_members_user ON public.tayseer_shared_vault_members(user_id);

CREATE TRIGGER trg_tayseer_shared_vaults_updated
BEFORE UPDATE ON public.tayseer_shared_vaults
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Bootstrap creator as 'owner' on vault insert
CREATE OR REPLACE FUNCTION public.tayseer_shared_vault_bootstrap_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.tayseer_shared_vault_members(vault_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'owner')
  ON CONFLICT (vault_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_tayseer_shared_vault_bootstrap
AFTER INSERT ON public.tayseer_shared_vaults
FOR EACH ROW EXECUTE FUNCTION public.tayseer_shared_vault_bootstrap_owner();

-- Helpers for shared-vault RLS
CREATE OR REPLACE FUNCTION public.is_shared_vault_member(p_vault_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tayseer_shared_vault_members
    WHERE vault_id = p_vault_id AND user_id = p_user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.has_shared_vault_role(p_vault_id UUID, p_user_id UUID, p_roles TEXT[])
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tayseer_shared_vault_members
    WHERE vault_id = p_vault_id AND user_id = p_user_id AND role = ANY(p_roles)
  );
$$;

ALTER TABLE public.tayseer_shared_vaults ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tayseer_shared_vault_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vault: members read"
  ON public.tayseer_shared_vaults FOR SELECT TO authenticated
  USING (
    public.is_shared_vault_member(id, auth.uid())
    OR (group_id IS NOT NULL AND public.is_family_member(group_id, auth.uid()))
  );

CREATE POLICY "vault: family member or any authed creates"
  ON public.tayseer_shared_vaults FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND (group_id IS NULL OR public.is_family_member(group_id, auth.uid()))
  );

CREATE POLICY "vault: owner updates"
  ON public.tayseer_shared_vaults FOR UPDATE TO authenticated
  USING (public.has_shared_vault_role(id, auth.uid(), ARRAY['owner']));

CREATE POLICY "vault: owner deletes"
  ON public.tayseer_shared_vaults FOR DELETE TO authenticated
  USING (public.has_shared_vault_role(id, auth.uid(), ARRAY['owner']));

CREATE POLICY "vault-members: members read roster"
  ON public.tayseer_shared_vault_members FOR SELECT TO authenticated
  USING (public.is_shared_vault_member(vault_id, auth.uid()));

CREATE POLICY "vault-members: owner invites"
  ON public.tayseer_shared_vault_members FOR INSERT TO authenticated
  WITH CHECK (public.has_shared_vault_role(vault_id, auth.uid(), ARRAY['owner']));

CREATE POLICY "vault-members: owner updates roles"
  ON public.tayseer_shared_vault_members FOR UPDATE TO authenticated
  USING (public.has_shared_vault_role(vault_id, auth.uid(), ARRAY['owner']));

CREATE POLICY "vault-members: owner removes or self-leave"
  ON public.tayseer_shared_vault_members FOR DELETE TO authenticated
  USING (
    public.has_shared_vault_role(vault_id, auth.uid(), ARRAY['owner'])
    OR user_id = auth.uid()
  );
