-- Phase 56 — Secure Handover RPC
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

  -- Future: validate OTP against delivery_snapshot->'handover'->>'otp'.
  -- MVP accepts any non-empty OTP.

  v_snapshot := COALESCE(v_node.delivery_snapshot, '{}'::jsonb);
  v_handover_meta := COALESCE(v_snapshot->'handover_meta', '[]'::jsonb);
  v_trace := jsonb_build_object(
    'channel', p_channel,
    'otp_provided', true,
    'confirmed_at', v_now,
    'actor', auth.uid()
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