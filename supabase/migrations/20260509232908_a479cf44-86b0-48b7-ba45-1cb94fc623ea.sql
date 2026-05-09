
-- ======================================================
-- PHASE 65: CONTEXTUAL CAPABILITY ENGINE (THE MASTER SWITCH)
-- ======================================================

-- 1) workspace_kind enum
DO $$ BEGIN
  CREATE TYPE public.workspace_kind AS ENUM ('reef','tayseer','noor_eldin','family','global');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2) workspace_contexts
CREATE TABLE IF NOT EXISTS public.workspace_contexts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind public.workspace_kind NOT NULL,
  owner_id UUID NOT NULL,
  label TEXT NOT NULL,
  theme_overlay JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_workspace_contexts_owner ON public.workspace_contexts(owner_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_workspace_contexts_owner_kind
  ON public.workspace_contexts(owner_id, kind);

ALTER TABLE public.workspace_contexts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owners read own workspaces" ON public.workspace_contexts;
CREATE POLICY "owners read own workspaces"
  ON public.workspace_contexts FOR SELECT
  USING (auth.uid() = owner_id OR public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "owners manage own workspaces" ON public.workspace_contexts;
CREATE POLICY "owners manage own workspaces"
  ON public.workspace_contexts FOR ALL
  USING (auth.uid() = owner_id OR public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (auth.uid() = owner_id OR public.has_role(auth.uid(), 'admin'::app_role));

-- 3) user_capabilities
CREATE TABLE IF NOT EXISTS public.user_capabilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  workspace_id UUID NOT NULL REFERENCES public.workspace_contexts(id) ON DELETE CASCADE,
  capability TEXT NOT NULL,
  granted_by UUID,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_caps
  ON public.user_capabilities(user_id, workspace_id, capability);
CREATE INDEX IF NOT EXISTS idx_user_caps_lookup
  ON public.user_capabilities(user_id, workspace_id);

ALTER TABLE public.user_capabilities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users read own caps" ON public.user_capabilities;
CREATE POLICY "users read own caps"
  ON public.user_capabilities FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "admins manage caps" ON public.user_capabilities;
CREATE POLICY "admins manage caps"
  ON public.user_capabilities FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 4) has_capability(uid, wid, cap)
CREATE OR REPLACE FUNCTION public.has_capability(p_uid UUID, p_wid UUID, p_cap TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_capabilities
    WHERE user_id = p_uid
      AND workspace_id = p_wid
      AND capability = p_cap
      AND (expires_at IS NULL OR expires_at > now())
  )
  OR public.has_role(p_uid, 'admin'::app_role);
$$;

-- 5) Ensure a workspace exists (by kind) for owner
CREATE OR REPLACE FUNCTION public.ensure_workspace(p_owner UUID, p_kind public.workspace_kind, p_label TEXT DEFAULT NULL)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  SELECT id INTO v_id FROM public.workspace_contexts
   WHERE owner_id = p_owner AND kind = p_kind LIMIT 1;
  IF v_id IS NULL THEN
    INSERT INTO public.workspace_contexts(kind, owner_id, label)
    VALUES (p_kind, p_owner, COALESCE(p_label, p_kind::text))
    RETURNING id INTO v_id;
  END IF;
  RETURN v_id;
END $$;

-- 6) Bridge: derive capabilities from user_roles + role_permissions
-- Maps each role's permission_key -> capability "<kind>.<permission_key>"
-- and a baseline "<kind>.access" for any active role.
CREATE OR REPLACE FUNCTION public.sync_user_capabilities_from_roles(p_uid UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_global UUID;
  v_reef   UUID;
  v_tayseer UUID;
  v_count INTEGER := 0;
BEGIN
  v_global   := public.ensure_workspace(p_uid, 'global', 'Global');
  v_reef     := public.ensure_workspace(p_uid, 'reef', 'Reef Al-Madina');
  v_tayseer  := public.ensure_workspace(p_uid, 'tayseer', 'Tayseer');

  -- baseline access caps
  INSERT INTO public.user_capabilities(user_id, workspace_id, capability)
  SELECT p_uid, v_global, 'global.access'
  WHERE NOT EXISTS (SELECT 1 FROM public.user_capabilities
                    WHERE user_id=p_uid AND workspace_id=v_global AND capability='global.access');

  -- For each active role of the user, project its permissions into both
  -- global and reef workspaces (Reef is the primary commerce surface).
  INSERT INTO public.user_capabilities(user_id, workspace_id, capability)
  SELECT p_uid, v_global, rp.permission_key
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON rp.role = ur.role
   WHERE ur.user_id = p_uid AND ur.is_active = true
  ON CONFLICT (user_id, workspace_id, capability) DO NOTHING;
  GET DIAGNOSTICS v_count = ROW_COUNT;

  INSERT INTO public.user_capabilities(user_id, workspace_id, capability)
  SELECT p_uid, v_reef, rp.permission_key
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON rp.role = ur.role
   WHERE ur.user_id = p_uid AND ur.is_active = true
  ON CONFLICT (user_id, workspace_id, capability) DO NOTHING;

  -- Domain access caps per role
  INSERT INTO public.user_capabilities(user_id, workspace_id, capability)
  SELECT p_uid, v_reef, 'reef.access'
   WHERE EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=p_uid AND is_active=true)
     AND NOT EXISTS (SELECT 1 FROM public.user_capabilities
                     WHERE user_id=p_uid AND workspace_id=v_reef AND capability='reef.access');

  INSERT INTO public.user_capabilities(user_id, workspace_id, capability)
  SELECT p_uid, v_tayseer, 'tayseer.access'
   WHERE NOT EXISTS (SELECT 1 FROM public.user_capabilities
                     WHERE user_id=p_uid AND workspace_id=v_tayseer AND capability='tayseer.access');

  RETURN v_count;
END $$;

-- 7) Trigger to auto-sync when roles change
CREATE OR REPLACE FUNCTION public.tg_sync_caps_from_roles()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.sync_user_capabilities_from_roles(COALESCE(NEW.user_id, OLD.user_id));
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_user_roles_sync_caps ON public.user_roles;
CREATE TRIGGER trg_user_roles_sync_caps
AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.tg_sync_caps_from_roles();

-- 8) updated_at trigger on workspace_contexts
DROP TRIGGER IF EXISTS trg_workspace_contexts_updated ON public.workspace_contexts;
CREATE TRIGGER trg_workspace_contexts_updated
BEFORE UPDATE ON public.workspace_contexts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 9) Convenience: list active workspaces for current user
CREATE OR REPLACE FUNCTION public.my_workspaces()
RETURNS TABLE(id UUID, kind public.workspace_kind, label TEXT, theme_overlay JSONB)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, kind, label, theme_overlay
    FROM public.workspace_contexts
   WHERE owner_id = auth.uid() AND is_active = true
   ORDER BY kind;
$$;
