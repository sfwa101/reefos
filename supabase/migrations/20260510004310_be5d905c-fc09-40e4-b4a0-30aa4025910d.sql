-- ============================================================
-- PHASE 66.3 — UNIFIED HUMAN PROFILE
-- ============================================================

-- 1) Partners → link to profiles
ALTER TABLE public.product_partners
  ADD COLUMN IF NOT EXISTS profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_product_partners_profile
  ON public.product_partners(profile_id);

-- Backfill by phone match (best-effort, normalize digits only)
UPDATE public.product_partners pp
SET profile_id = p.id
FROM public.profiles p
WHERE pp.profile_id IS NULL
  AND pp.partner_phone IS NOT NULL
  AND p.phone IS NOT NULL
  AND regexp_replace(pp.partner_phone, '\D', '', 'g')
      = regexp_replace(p.phone, '\D', '', 'g');

-- 2) Vendor index for fast 360 lookups (FK to profiles already implicit via auth.users)
CREATE INDEX IF NOT EXISTS idx_vendors_owner_user
  ON public.vendors(owner_user_id);

-- 3) The Human Relationships View
CREATE OR REPLACE VIEW public.human_relationships AS
  -- Customer: anyone with lifetime spend or a profile row
  SELECT
    p.id            AS profile_id,
    'customer'::text AS kind,
    p.id::text      AS ref_id,
    p.created_at    AS started_at
  FROM public.profiles p
  WHERE p.loyalty_lifetime_spend > 0 OR p.loyalty_points > 0

  UNION ALL
  -- Vendor (legacy table)
  SELECT
    v.owner_user_id AS profile_id,
    'vendor'::text  AS kind,
    v.id::text      AS ref_id,
    v.created_at    AS started_at
  FROM public.vendors v
  WHERE v.owner_user_id IS NOT NULL AND v.is_active

  UNION ALL
  -- Vendor (Salsabil federation)
  SELECT
    svm.user_id     AS profile_id,
    'vendor'::text  AS kind,
    svm.vendor_id::text AS ref_id,
    svm.created_at  AS started_at
  FROM public.salsabil_vendor_members svm

  UNION ALL
  -- Partner
  SELECT
    pp.profile_id   AS profile_id,
    'partner'::text AS kind,
    pp.id::text     AS ref_id,
    pp.created_at   AS started_at
  FROM public.product_partners pp
  WHERE pp.profile_id IS NOT NULL AND pp.is_active

  UNION ALL
  -- Staff (any role that isn't pure consumer)
  SELECT
    ur.user_id      AS profile_id,
    'staff'::text   AS kind,
    ur.role::text   AS ref_id,
    ur.created_at   AS started_at
  FROM public.user_roles ur
  WHERE ur.is_active
    AND ur.role::text IN ('admin','branch_manager','store_manager','finance',
                          'cashier','delivery','inventory_clerk','staff','collector')

  UNION ALL
  -- Workspace member (Phase 65 capability presence)
  SELECT DISTINCT
    uc.user_id      AS profile_id,
    'workspace_member'::text AS kind,
    uc.workspace_id::text    AS ref_id,
    MIN(uc.created_at) OVER (PARTITION BY uc.user_id, uc.workspace_id) AS started_at
  FROM public.user_capabilities uc;

COMMENT ON VIEW public.human_relationships IS
  'Phase 66.3 — projects every relationship a human holds across Customer/Vendor/Partner/Staff/Workspace silos.';

-- 4) get_human_360 RPC — admin-only, returns single JSONB blob
CREATE OR REPLACE FUNCTION public.get_human_360(p_profile_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_identity jsonb;
  v_relationships jsonb;
  v_customer jsonb;
  v_vendor jsonb;
  v_staff jsonb;
  v_partner jsonb;
  v_capabilities jsonb;
BEGIN
  -- Authorisation: admin only
  IF v_caller IS NULL OR NOT public.has_role(v_caller, 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  -- Identity
  SELECT to_jsonb(p) - 'vehicle_dna' INTO v_identity
  FROM public.profiles p WHERE p.id = p_profile_id;

  IF v_identity IS NULL THEN
    RETURN jsonb_build_object('error', 'profile_not_found');
  END IF;

  -- Relationship chips (distinct kinds)
  SELECT jsonb_agg(DISTINCT kind) INTO v_relationships
  FROM public.human_relationships
  WHERE profile_id = p_profile_id;

  -- Customer facet
  SELECT jsonb_build_object(
    'lifetime_spend', COALESCE((SELECT loyalty_lifetime_spend FROM public.profiles WHERE id = p_profile_id), 0),
    'loyalty_points', COALESCE((SELECT loyalty_points FROM public.profiles WHERE id = p_profile_id), 0),
    'loyalty_tier',   (SELECT loyalty_tier FROM public.profiles WHERE id = p_profile_id)
  ) INTO v_customer;

  -- Vendor facet (union of legacy + salsabil)
  SELECT jsonb_build_object(
    'legacy_vendors', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('id', id, 'name', name, 'type', vendor_type, 'commission_pct', commission_pct, 'is_active', is_active))
      FROM public.vendors WHERE owner_user_id = p_profile_id
    ), '[]'::jsonb),
    'salsabil_memberships', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('vendor_id', sv.id, 'business_name', sv.business_name, 'role', svm.role, 'is_active', sv.is_active))
      FROM public.salsabil_vendor_members svm
      JOIN public.salsabil_vendors sv ON sv.id = svm.vendor_id
      WHERE svm.user_id = p_profile_id
    ), '[]'::jsonb),
    'wallet_available', COALESCE((
      SELECT SUM(available_balance) FROM public.vendor_wallets vw
      JOIN public.vendors v ON v.id = vw.vendor_id WHERE v.owner_user_id = p_profile_id
    ), 0)
  ) INTO v_vendor;

  -- Staff facet
  SELECT jsonb_build_object(
    'roles', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('role', role::text, 'branch_id', branch_id, 'is_active', is_active))
      FROM public.user_roles WHERE user_id = p_profile_id
    ), '[]'::jsonb),
    'open_advances', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('id', id, 'kind', kind, 'amount', amount, 'status', status, 'created_at', created_at))
      FROM public.staff_advance_requests WHERE user_id = p_profile_id AND status IN ('pending','approved')
    ), '[]'::jsonb),
    'open_advance_total', COALESCE((
      SELECT SUM(amount) FROM public.staff_advance_requests
      WHERE user_id = p_profile_id AND status IN ('pending','approved')
    ), 0)
  ) INTO v_staff;

  -- Partner facet
  SELECT jsonb_build_object(
    'partnerships', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('id', pp.id, 'product_id', pp.product_id, 'split_type', pp.split_type, 'percentage', pp.percentage, 'is_active', pp.is_active))
      FROM public.product_partners pp WHERE pp.profile_id = p_profile_id
    ), '[]'::jsonb),
    'amount_due', COALESCE((
      SELECT SUM(pl.amount_due) FROM public.partner_ledgers pl
      JOIN public.product_partners pp ON pp.id = pl.partner_id
      WHERE pp.profile_id = p_profile_id AND pl.status = 'accrued'
    ), 0),
    'amount_paid', COALESCE((
      SELECT SUM(pl.amount_due) FROM public.partner_ledgers pl
      JOIN public.product_partners pp ON pp.id = pl.partner_id
      WHERE pp.profile_id = p_profile_id AND pl.status = 'paid'
    ), 0)
  ) INTO v_partner;

  -- Capabilities (Phase 65)
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'workspace_id', uc.workspace_id,
    'workspace_kind', wc.kind,
    'capability', uc.capability,
    'expires_at', uc.expires_at
  )), '[]'::jsonb)
  INTO v_capabilities
  FROM public.user_capabilities uc
  LEFT JOIN public.workspace_contexts wc ON wc.id = uc.workspace_id
  WHERE uc.user_id = p_profile_id;

  RETURN jsonb_build_object(
    'identity',      v_identity,
    'relationships', COALESCE(v_relationships, '[]'::jsonb),
    'customer',      v_customer,
    'vendor',        v_vendor,
    'staff',         v_staff,
    'partner',       v_partner,
    'capabilities',  v_capabilities,
    'fetched_at',    now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_human_360(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_human_360(uuid) TO authenticated;

COMMENT ON FUNCTION public.get_human_360(uuid) IS
  'Phase 66.3 — Admin-only 360° human view. Returns identity + customer + vendor + staff + partner + capabilities in a single JSONB.';
