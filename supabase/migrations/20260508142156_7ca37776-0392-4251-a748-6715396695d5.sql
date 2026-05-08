
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS national_id text,
  ADD COLUMN IF NOT EXISTS short_id text,
  ADD COLUMN IF NOT EXISTS governorate text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS is_kyc_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS kyc_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS avatar_kind text;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_national_id_unique
  ON public.profiles (national_id)
  WHERE national_id IS NOT NULL;

-- Phone existence check (security definer, callable by anon).
-- Normalizes incoming phone to digits and matches against profiles.phone OR
-- the synthesized auth email pattern `<digits>@reef.local`.
CREATE OR REPLACE FUNCTION public.check_phone_exists(p_phone text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_digits text;
  v_email  text;
  v_found  boolean;
BEGIN
  v_digits := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  IF length(v_digits) < 10 THEN
    RETURN false;
  END IF;
  v_email := v_digits || '@reef.local';

  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE phone = v_digits
    UNION ALL
    SELECT 1 FROM auth.users WHERE email = v_email
  ) INTO v_found;

  RETURN coalesce(v_found, false);
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_phone_exists(text) TO anon, authenticated;
