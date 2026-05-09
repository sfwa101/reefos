CREATE OR REPLACE FUNCTION public.admin_trigger_circuit_breaker(
  p_setting_key text,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_trace uuid := gen_random_uuid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  IF NOT (public.has_role(v_uid, 'admin'::app_role) OR public.has_role(v_uid, 'finance'::app_role)) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF p_setting_key NOT IN ('ai_orchestration_enabled','payments_enabled','system_maintenance') THEN
    RAISE EXCEPTION 'invalid setting key: %', p_setting_key;
  END IF;

  INSERT INTO public.app_settings(key, value, updated_by)
  VALUES (p_setting_key, to_jsonb(false), v_uid)
  ON CONFLICT (key) DO UPDATE
    SET value = to_jsonb(false), updated_by = v_uid, updated_at = now();

  INSERT INTO public.salsabil_event_timeline(trace_id, actor_id, event_domain, event_type, payload)
  VALUES (
    v_trace, v_uid, 'system', 'circuit_breaker_tripped',
    jsonb_build_object(
      'setting_key', p_setting_key,
      'reason', p_reason,
      'tripped_at', now()
    )
  );

  RETURN jsonb_build_object('ok', true, 'trace_id', v_trace, 'key', p_setting_key);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_trigger_circuit_breaker(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_trigger_circuit_breaker(text, text) TO authenticated;