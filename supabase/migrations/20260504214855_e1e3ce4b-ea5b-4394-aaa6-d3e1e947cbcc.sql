
DROP FUNCTION IF EXISTS public.join_gam_eya(uuid, integer, uuid);
DROP FUNCTION IF EXISTS public.join_gam_eya(uuid, integer);
DROP FUNCTION IF EXISTS public.join_gam_eya(uuid);

CREATE OR REPLACE FUNCTION public.list_open_gam_eyas()
RETURNS TABLE (
  id uuid,
  name text,
  cycle_amount numeric,
  max_members integer,
  cycle_duration_months integer,
  min_kyc_tier integer,
  reward_pool numeric,
  status text,
  starts_at timestamptz,
  members_count integer,
  is_member boolean
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    g.id, g.name, g.cycle_amount, g.max_members,
    g.cycle_duration_months, g.min_kyc_tier, g.reward_pool,
    g.status::text, g.starts_at,
    (SELECT COUNT(*)::int FROM public.gam_eya_members m WHERE m.gam_eya_id = g.id) AS members_count,
    EXISTS (SELECT 1 FROM public.gam_eya_members m
            WHERE m.gam_eya_id = g.id AND m.user_id = auth.uid()) AS is_member
  FROM public.gam_eyas g
  WHERE g.status IN ('pending','active')
  ORDER BY g.created_at DESC
  LIMIT 50;
$$;

CREATE FUNCTION public.join_gam_eya(
  _circle_id uuid,
  _turn_number integer,
  _guarantor_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_max integer;
  v_min_tier integer;
  v_user_tier integer;
  v_member_id uuid;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;

  SELECT max_members, COALESCE(min_kyc_tier,0)
  INTO v_max, v_min_tier
  FROM public.gam_eyas
  WHERE id = _circle_id AND status IN ('pending','active');

  IF v_max IS NULL THEN RAISE EXCEPTION 'circle_not_found'; END IF;
  IF _turn_number < 1 OR _turn_number > v_max THEN RAISE EXCEPTION 'invalid_turn'; END IF;

  SELECT COALESCE(tier,0) INTO v_user_tier
  FROM public.user_trust_score WHERE user_id = v_user;
  v_user_tier := COALESCE(v_user_tier, 0);

  IF _turn_number <= GREATEST(2, v_max / 3) THEN
    IF v_user_tier < v_min_tier AND _guarantor_id IS NULL THEN
      RAISE EXCEPTION 'guarantor_required';
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM public.gam_eya_members
             WHERE gam_eya_id = _circle_id AND turn_number = _turn_number) THEN
    RAISE EXCEPTION 'turn_taken';
  END IF;

  INSERT INTO public.gam_eya_members (
    gam_eya_id, user_id, turn_number, is_trusted, guarantor_id, kyc_tier_at_join
  )
  VALUES (
    _circle_id, v_user, _turn_number, v_user_tier >= v_min_tier, _guarantor_id, v_user_tier
  )
  RETURNING id INTO v_member_id;

  RETURN v_member_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.list_open_gam_eyas() TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_gam_eya(uuid, integer, uuid) TO authenticated;
