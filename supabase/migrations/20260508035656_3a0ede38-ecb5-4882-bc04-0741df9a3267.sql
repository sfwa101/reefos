-- Phase 11.1 — Sovereign Clearance RPC
ALTER TABLE public.salsabil_vendor_settlements
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE OR REPLACE FUNCTION public.clear_sovereign_settlements(p_vendor_id uuid)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  WITH updated AS (
    UPDATE public.salsabil_vendor_settlements
       SET status = 'cleared',
           updated_at = now()
     WHERE vendor_id = p_vendor_id
       AND status = 'pending_clearance'
    RETURNING id
  )
  SELECT count(*)::int INTO v_count FROM updated;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.clear_sovereign_settlements(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.clear_sovereign_settlements(uuid) TO authenticated;