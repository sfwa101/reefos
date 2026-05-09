-- Phase 43 — admin_manage_staff_role + admin_update_partner_ledger
-- SECURITY DEFINER RPCs to remove client-side direct mutations on user_roles and partner_ledgers.

CREATE OR REPLACE FUNCTION public.admin_manage_staff_role(
  p_user_id uuid,
  p_role app_role,
  p_action text,
  p_role_id uuid DEFAULT NULL,
  p_is_active boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_result jsonb;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'unauthorized: no session';
  END IF;
  IF NOT (public.has_role(v_caller, 'admin') OR public.has_role(v_caller, 'super_admin')) THEN
    RAISE EXCEPTION 'unauthorized: admin role required';
  END IF;

  IF p_action = 'insert' THEN
    INSERT INTO public.user_roles (user_id, role, is_active)
    VALUES (p_user_id, p_role, COALESCE(p_is_active, true))
    RETURNING jsonb_build_object('id', id, 'user_id', user_id, 'role', role, 'is_active', is_active)
    INTO v_result;
  ELSIF p_action = 'update' THEN
    IF p_role_id IS NULL THEN RAISE EXCEPTION 'role_id required for update'; END IF;
    UPDATE public.user_roles
       SET role = p_role,
           is_active = COALESCE(p_is_active, is_active)
     WHERE id = p_role_id
    RETURNING jsonb_build_object('id', id, 'user_id', user_id, 'role', role, 'is_active', is_active)
    INTO v_result;
  ELSIF p_action = 'delete' THEN
    IF p_role_id IS NULL THEN RAISE EXCEPTION 'role_id required for delete'; END IF;
    DELETE FROM public.user_roles WHERE id = p_role_id
    RETURNING jsonb_build_object('id', id, 'deleted', true) INTO v_result;
  ELSE
    RAISE EXCEPTION 'invalid action: %', p_action;
  END IF;

  RETURN COALESCE(v_result, jsonb_build_object('ok', true));
END;
$$;

REVOKE ALL ON FUNCTION public.admin_manage_staff_role(uuid, app_role, text, uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_manage_staff_role(uuid, app_role, text, uuid, boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_update_partner_ledger(
  p_ledger_id uuid,
  p_status text DEFAULT NULL,
  p_mark_paid boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_result jsonb;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'unauthorized: no session';
  END IF;
  IF NOT (public.has_role(v_caller, 'admin') OR public.has_role(v_caller, 'finance') OR public.has_role(v_caller, 'super_admin')) THEN
    RAISE EXCEPTION 'unauthorized: finance/admin role required';
  END IF;

  IF p_mark_paid THEN
    UPDATE public.partner_ledgers
       SET status = 'paid',
           paid_at = now()
     WHERE id = p_ledger_id
    RETURNING jsonb_build_object('id', id, 'status', status, 'paid_at', paid_at) INTO v_result;
  ELSIF p_status IS NOT NULL THEN
    UPDATE public.partner_ledgers
       SET status = p_status
     WHERE id = p_ledger_id
    RETURNING jsonb_build_object('id', id, 'status', status) INTO v_result;
  ELSE
    RAISE EXCEPTION 'no-op: provide p_status or p_mark_paid';
  END IF;

  RETURN COALESCE(v_result, jsonb_build_object('ok', true));
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_partner_ledger(uuid, text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_update_partner_ledger(uuid, text, boolean) TO authenticated;