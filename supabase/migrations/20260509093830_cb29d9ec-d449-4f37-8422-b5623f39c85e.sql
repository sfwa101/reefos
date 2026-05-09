REVOKE EXECUTE ON FUNCTION public.log_sovereign_event(UUID, TEXT, TEXT, JSONB) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.log_sovereign_event(UUID, TEXT, TEXT, JSONB) TO authenticated;