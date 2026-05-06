
-- ============ ACTION 1: CORPORATE IDENTITY & RBAC ============
CREATE TABLE public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  tax_id varchar(50),
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','SUSPENDED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.company_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('OWNER','PURCHASER','FINANCE')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, user_id)
);
CREATE INDEX idx_company_members_user ON public.company_members(user_id);
CREATE INDEX idx_company_members_company ON public.company_members(company_id);

-- ============ ACTION 2: CORPORATE FINANCE & CREDIT ============
CREATE TABLE public.company_credit_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL UNIQUE REFERENCES public.companies(id) ON DELETE CASCADE,
  approved_limit numeric(18,2) NOT NULL DEFAULT 0,
  used_amount numeric(18,2) NOT NULL DEFAULT 0,
  net_terms_days integer NOT NULL DEFAULT 30,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (used_amount <= approved_limit),
  CHECK (approved_limit >= 0),
  CHECK (used_amount >= 0)
);

-- ============ ACTION 3: WHOLESALE PRICING ============
CREATE TABLE public.pricing_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id text NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  min_quantity numeric(18,2) NOT NULL CHECK (min_quantity > 0),
  price numeric(18,2) NOT NULL CHECK (price >= 0),
  tier_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(product_id, min_quantity)
);
CREATE INDEX idx_pricing_tiers_product ON public.pricing_tiers(product_id);

-- ============ ACTION 4: B2B PROCUREMENT ============
CREATE TABLE public.purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  status text NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT','PENDING_APPROVAL','APPROVED','REJECTED','FULFILLED')),
  total_amount numeric(18,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_po_company ON public.purchase_orders(company_id);
CREATE INDEX idx_po_status ON public.purchase_orders(status);

CREATE TABLE public.purchase_order_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id uuid NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  product_id text NOT NULL REFERENCES public.products(id),
  quantity numeric(18,2) NOT NULL CHECK (quantity > 0),
  unit_price numeric(18,2) NOT NULL CHECK (unit_price >= 0),
  UNIQUE(po_id, product_id)
);
CREATE INDEX idx_pol_po ON public.purchase_order_lines(po_id);

-- ============ HELPER FUNCTIONS (avoid RLS recursion) ============
CREATE OR REPLACE FUNCTION public.is_company_member(_user_id uuid, _company_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_members
    WHERE user_id = _user_id AND company_id = _company_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_company_role(_user_id uuid, _company_id uuid, _role text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_members
    WHERE user_id = _user_id AND company_id = _company_id AND role = _role
  );
$$;

-- ============ ACTION 5: get_user_companies RPC ============
CREATE OR REPLACE FUNCTION public.get_user_companies(p_user_id uuid)
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'company_id', c.id,
    'name', c.name,
    'tax_id', c.tax_id,
    'status', c.status,
    'role', cm.role
  )), '[]'::jsonb)
  FROM public.company_members cm
  JOIN public.companies c ON c.id = cm.company_id
  WHERE cm.user_id = p_user_id;
$$;

-- ============ ENABLE RLS ============
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_credit_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_lines ENABLE ROW LEVEL SECURITY;

-- ============ RLS: companies ============
CREATE POLICY "companies_select_members_or_admin" ON public.companies
FOR SELECT TO authenticated
USING (public.is_company_member(auth.uid(), id) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "companies_insert_authenticated" ON public.companies
FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "companies_update_owner_or_admin" ON public.companies
FOR UPDATE TO authenticated
USING (public.is_company_role(auth.uid(), id, 'OWNER') OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.is_company_role(auth.uid(), id, 'OWNER') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "companies_delete_admin" ON public.companies
FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ============ RLS: company_members ============
CREATE POLICY "members_select_same_company_or_admin" ON public.company_members
FOR SELECT TO authenticated
USING (public.is_company_member(auth.uid(), company_id) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "members_insert_owner_or_admin" ON public.company_members
FOR INSERT TO authenticated
WITH CHECK (
  public.is_company_role(auth.uid(), company_id, 'OWNER')
  OR public.has_role(auth.uid(), 'admin')
  OR NOT EXISTS (SELECT 1 FROM public.company_members WHERE company_id = company_members.company_id)
);

CREATE POLICY "members_update_owner_or_admin" ON public.company_members
FOR UPDATE TO authenticated
USING (public.is_company_role(auth.uid(), company_id, 'OWNER') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "members_delete_owner_or_admin" ON public.company_members
FOR DELETE TO authenticated
USING (public.is_company_role(auth.uid(), company_id, 'OWNER') OR public.has_role(auth.uid(), 'admin'));

-- ============ RLS: company_credit_lines ============
CREATE POLICY "credit_select_members_or_admin" ON public.company_credit_lines
FOR SELECT TO authenticated
USING (public.is_company_member(auth.uid(), company_id) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "credit_admin_write" ON public.company_credit_lines
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ RLS: pricing_tiers ============
CREATE POLICY "tiers_select_all" ON public.pricing_tiers
FOR SELECT TO authenticated, anon USING (true);

CREATE POLICY "tiers_admin_write" ON public.pricing_tiers
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ RLS: purchase_orders ============
CREATE POLICY "po_select_members_or_admin" ON public.purchase_orders
FOR SELECT TO authenticated
USING (public.is_company_member(auth.uid(), company_id) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "po_insert_members" ON public.purchase_orders
FOR INSERT TO authenticated
WITH CHECK (
  (public.is_company_member(auth.uid(), company_id) AND created_by = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "po_update_owner_purchaser_or_admin" ON public.purchase_orders
FOR UPDATE TO authenticated
USING (
  public.is_company_role(auth.uid(), company_id, 'OWNER')
  OR public.is_company_role(auth.uid(), company_id, 'PURCHASER')
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "po_delete_owner_or_admin" ON public.purchase_orders
FOR DELETE TO authenticated
USING (public.is_company_role(auth.uid(), company_id, 'OWNER') OR public.has_role(auth.uid(), 'admin'));

-- ============ RLS: purchase_order_lines ============
CREATE POLICY "pol_select_members_or_admin" ON public.purchase_order_lines
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.purchase_orders po
    WHERE po.id = po_id
    AND (public.is_company_member(auth.uid(), po.company_id) OR public.has_role(auth.uid(), 'admin'))
  )
);

CREATE POLICY "pol_write_members_or_admin" ON public.purchase_order_lines
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.purchase_orders po
    WHERE po.id = po_id
    AND (public.is_company_member(auth.uid(), po.company_id) OR public.has_role(auth.uid(), 'admin'))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.purchase_orders po
    WHERE po.id = po_id
    AND (public.is_company_member(auth.uid(), po.company_id) OR public.has_role(auth.uid(), 'admin'))
  )
);

-- ============ Triggers for updated_at ============
CREATE TRIGGER trg_companies_updated_at BEFORE UPDATE ON public.companies
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_credit_updated_at BEFORE UPDATE ON public.company_credit_lines
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_po_updated_at BEFORE UPDATE ON public.purchase_orders
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
