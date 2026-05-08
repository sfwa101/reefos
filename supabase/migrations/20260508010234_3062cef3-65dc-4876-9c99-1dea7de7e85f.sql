-- Phase 9 Part 1 — Vendor Genesis: Multi-tenant SaaS foundation

CREATE TABLE IF NOT EXISTS public.salsabil_vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name text NOT NULL,
  logo_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.salsabil_vendor_members (
  vendor_id uuid NOT NULL REFERENCES public.salsabil_vendors(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'owner',
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (vendor_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_salsabil_vendor_members_user
  ON public.salsabil_vendor_members(user_id);

ALTER TABLE public.salsabil_vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salsabil_vendor_members ENABLE ROW LEVEL SECURITY;

-- Security definer helper to avoid RLS recursion when checking membership
CREATE OR REPLACE FUNCTION public.is_vendor_member(_user_id uuid, _vendor_id uuid, _role text DEFAULT NULL)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.salsabil_vendor_members
    WHERE vendor_id = _vendor_id
      AND user_id = _user_id
      AND (_role IS NULL OR role = _role)
  );
$$;

-- ===== salsabil_vendors policies =====
CREATE POLICY "Admins manage all vendors"
ON public.salsabil_vendors
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Members can read their vendor"
ON public.salsabil_vendors
FOR SELECT
TO authenticated
USING (public.is_vendor_member(auth.uid(), id, NULL));

-- ===== salsabil_vendor_members policies =====
CREATE POLICY "Admins manage all memberships"
ON public.salsabil_vendor_members
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Members can read peer memberships"
ON public.salsabil_vendor_members
FOR SELECT
TO authenticated
USING (public.is_vendor_member(auth.uid(), vendor_id, NULL));

CREATE POLICY "Owners can manage members"
ON public.salsabil_vendor_members
FOR ALL
TO authenticated
USING (public.is_vendor_member(auth.uid(), vendor_id, 'owner'))
WITH CHECK (public.is_vendor_member(auth.uid(), vendor_id, 'owner'));