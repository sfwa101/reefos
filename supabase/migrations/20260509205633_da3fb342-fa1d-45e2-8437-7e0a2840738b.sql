-- Phase 58 — Sovereign OTP & Vehicle DNA

-- 1) vehicle_dna on profiles (groundwork for driver compatibility scoring)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS vehicle_dna jsonb NOT NULL DEFAULT '{}'::jsonb;

-- 2) issue_handover_otp — mints a random 4-digit OTP into delivery_snapshot.handover
CREATE OR REPLACE FUNCTION public.issue_handover_otp(p_node_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_otp text;
  v_snapshot jsonb;
  v_handover jsonb;
BEGIN
  v_otp := lpad((floor(random() * 10000))::int::text, 4, '0');

  SELECT COALESCE(delivery_snapshot, '{}'::jsonb) INTO v_snapshot
  FROM public.salsabil_fulfillment_nodes
  WHERE id = p_node_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'NODE_NOT_FOUND';
  END IF;

  v_handover := jsonb_build_object(
    'otp', v_otp,
    'issued_at', to_jsonb(now())
  );

  UPDATE public.salsabil_fulfillment_nodes
     SET delivery_snapshot = jsonb_set(v_snapshot, '{handover}', v_handover, true)
   WHERE id = p_node_id;

  RETURN v_otp;
END;
$$;

GRANT EXECUTE ON FUNCTION public.issue_handover_otp(uuid) TO authenticated;

-- 3) Auto-issue OTP when node transitions to ready_for_pickup
CREATE OR REPLACE FUNCTION public.auto_issue_handover_otp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_otp text;
  v_snapshot jsonb;
BEGIN
  IF NEW.status = 'ready_for_pickup' AND COALESCE(OLD.status, '') <> 'ready_for_pickup' THEN
    v_snapshot := COALESCE(NEW.delivery_snapshot, '{}'::jsonb);
    -- Only mint if not already present
    IF v_snapshot->'handover'->>'otp' IS NULL THEN
      v_otp := lpad((floor(random() * 10000))::int::text, 4, '0');
      NEW.delivery_snapshot := jsonb_set(
        v_snapshot,
        '{handover}',
        jsonb_build_object('otp', v_otp, 'issued_at', to_jsonb(now())),
        true
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_issue_handover_otp ON public.salsabil_fulfillment_nodes;
CREATE TRIGGER trg_auto_issue_handover_otp
  BEFORE UPDATE ON public.salsabil_fulfillment_nodes
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_issue_handover_otp();

-- 4) Tighten confirm_handover — strict OTP comparison
CREATE OR REPLACE FUNCTION public.confirm_handover(
  p_node_id uuid,
  p_otp text,
  p_channel text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_node record;
  v_now timestamptz := now();
  v_new_status text;
  v_snapshot jsonb;
  v_trace jsonb;
  v_handover_meta jsonb;
  v_expected_otp text;
  v_provided text;
BEGIN
  IF p_otp IS NULL OR length(trim(p_otp)) = 0 THEN
    RAISE EXCEPTION 'OTP_REQUIRED';
  END IF;

  IF p_channel NOT IN ('driver', 'walkin') THEN
    RAISE EXCEPTION 'INVALID_CHANNEL';
  END IF;

  SELECT id, status, delivery_snapshot
    INTO v_node
  FROM public.salsabil_fulfillment_nodes
  WHERE id = p_node_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'NODE_NOT_FOUND';
  END IF;

  IF v_node.status NOT IN ('ready_for_pickup', 'assigned') THEN
    RAISE EXCEPTION 'INVALID_STATUS:%', v_node.status;
  END IF;

  v_snapshot := COALESCE(v_node.delivery_snapshot, '{}'::jsonb);
  v_expected_otp := v_snapshot->'handover'->>'otp';
  v_provided := trim(p_otp);

  IF v_expected_otp IS NULL THEN
    RAISE EXCEPTION 'otp_not_issued';
  END IF;

  IF v_expected_otp <> v_provided THEN
    RAISE EXCEPTION 'invalid_otp';
  END IF;

  v_handover_meta := COALESCE(v_snapshot->'handover_meta', '[]'::jsonb);
  v_trace := jsonb_build_object(
    'channel', p_channel,
    'otp_verified', true,
    'confirmed_at', to_jsonb(v_now),
    'actor', to_jsonb(auth.uid())
  );
  v_handover_meta := v_handover_meta || jsonb_build_array(v_trace);

  IF p_channel = 'walkin' THEN
    v_new_status := 'delivered_walkin';
    UPDATE public.salsabil_fulfillment_nodes
       SET status = v_new_status,
           delivered_at = v_now,
           delivery_snapshot = jsonb_set(v_snapshot, '{handover_meta}', v_handover_meta, true)
     WHERE id = p_node_id;
  ELSE
    v_new_status := 'shipped';
    UPDATE public.salsabil_fulfillment_nodes
       SET status = v_new_status,
           picked_up_at = v_now,
           delivery_snapshot = jsonb_set(v_snapshot, '{handover_meta}', v_handover_meta, true)
     WHERE id = p_node_id;
  END IF;

  RETURN jsonb_build_object(
    'node_id', p_node_id,
    'status', v_new_status,
    'channel', p_channel,
    'at', v_now
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.confirm_handover(uuid, text, text) TO authenticated;

-- 5) get_handover_otp — secure read for customer OR assigned driver OR staff/admin
CREATE OR REPLACE FUNCTION public.get_handover_otp(p_node_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_snapshot jsonb;
  v_driver_id uuid;
  v_customer_id uuid;
  v_my_driver_id uuid;
  v_is_staff boolean;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthenticated';
  END IF;

  SELECT delivery_snapshot, driver_id
    INTO v_snapshot, v_driver_id
  FROM public.salsabil_fulfillment_nodes
  WHERE id = p_node_id;

  IF v_snapshot IS NULL THEN
    RAISE EXCEPTION 'NODE_NOT_FOUND';
  END IF;

  v_customer_id := NULLIF(v_snapshot->>'customer_id','')::uuid;

  SELECT id INTO v_my_driver_id FROM public.drivers WHERE user_id = v_uid LIMIT 1;

  v_is_staff := public.has_role(v_uid, 'admin')
             OR public.has_role(v_uid, 'staff')
             OR public.has_role(v_uid, 'manager');

  IF v_is_staff
     OR (v_my_driver_id IS NOT NULL AND v_my_driver_id = v_driver_id)
     OR (v_customer_id IS NOT NULL AND v_customer_id = v_uid)
  THEN
    RETURN v_snapshot->'handover'->>'otp';
  END IF;

  RAISE EXCEPTION 'forbidden';
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_handover_otp(uuid) TO authenticated;