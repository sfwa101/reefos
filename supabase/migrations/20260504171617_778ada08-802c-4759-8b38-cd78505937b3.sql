
REVOKE EXECUTE ON FUNCTION public.create_gam_eya(text, numeric, integer, timestamptz) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.join_gam_eya(uuid, integer, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.pay_gam_eya_installment(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_user_daily_transfer_limit(uuid) FROM anon, public;

GRANT EXECUTE ON FUNCTION public.create_gam_eya(text, numeric, integer, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_gam_eya(uuid, integer, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pay_gam_eya_installment(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_daily_transfer_limit(uuid) TO authenticated;
