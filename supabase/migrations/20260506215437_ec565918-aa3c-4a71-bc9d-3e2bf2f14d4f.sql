
-- =====================================================================
-- PHASE Q — OFFLINE-FIRST EDGE PROTOCOL (DIFF ENGINE)
-- =====================================================================

-- ---------- ACTION 1: TOMBSTONES ----------
ALTER TABLE public.global_catalog
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.vendor_inventory
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_global_catalog_updated   ON public.global_catalog(updated_at);
CREATE INDEX IF NOT EXISTS idx_vendor_inventory_updated ON public.vendor_inventory(updated_at);

-- Soft-delete trigger: convert DELETE into UPDATE deleted_at = now()
CREATE OR REPLACE FUNCTION public.tg_soft_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  EXECUTE format(
    'UPDATE %I.%I SET deleted_at = now(), updated_at = now() WHERE id = $1 AND deleted_at IS NULL',
    TG_TABLE_SCHEMA, TG_TABLE_NAME
  ) USING OLD.id;
  RETURN NULL; -- cancel hard delete
END;
$$;

DROP TRIGGER IF EXISTS trg_soft_delete_global_catalog   ON public.global_catalog;
CREATE TRIGGER trg_soft_delete_global_catalog
  BEFORE DELETE ON public.global_catalog
  FOR EACH ROW EXECUTE FUNCTION public.tg_soft_delete();

DROP TRIGGER IF EXISTS trg_soft_delete_vendor_inventory ON public.vendor_inventory;
CREATE TRIGGER trg_soft_delete_vendor_inventory
  BEFORE DELETE ON public.vendor_inventory
  FOR EACH ROW EXECUTE FUNCTION public.tg_soft_delete();

-- ---------- ACTION 2: pull_catalog_sync ----------
CREATE OR REPLACE FUNCTION public.pull_catalog_sync(
  p_last_sync timestamptz DEFAULT '1970-01-01'::timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now timestamptz := now();
  v_upserted jsonb;
  v_deleted  jsonb;
BEGIN
  SELECT COALESCE(jsonb_agg(to_jsonb(g)), '[]'::jsonb)
    INTO v_upserted
  FROM public.global_catalog g
  WHERE g.updated_at > p_last_sync
    AND g.deleted_at IS NULL;

  SELECT COALESCE(jsonb_agg(g.id), '[]'::jsonb)
    INTO v_deleted
  FROM public.global_catalog g
  WHERE g.updated_at > p_last_sync
    AND g.deleted_at IS NOT NULL;

  RETURN jsonb_build_object(
    'server_time', v_now,
    'upserted',    v_upserted,
    'deleted_ids', v_deleted
  );
END;
$$;

REVOKE ALL ON FUNCTION public.pull_catalog_sync(timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pull_catalog_sync(timestamptz) TO authenticated, service_role;

-- ---------- ACTION 3: pull_wallet_sync ----------
CREATE OR REPLACE FUNCTION public.pull_wallet_sync(
  p_last_sync timestamptz DEFAULT '1970-01-01'::timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid  uuid := auth.uid();
  v_now  timestamptz := now();
  v_wallets jsonb;
  v_entries jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  SELECT COALESCE(jsonb_agg(to_jsonb(w)), '[]'::jsonb)
    INTO v_wallets
  FROM public.wallets w
  WHERE w.user_id = v_uid
    AND w.updated_at > p_last_sync;

  SELECT COALESCE(jsonb_agg(to_jsonb(le) ORDER BY le.created_at), '[]'::jsonb)
    INTO v_entries
  FROM public.ledger_entries le
  JOIN public.wallets w ON w.id = le.wallet_id
  WHERE w.user_id = v_uid
    AND le.created_at > p_last_sync;

  RETURN jsonb_build_object(
    'server_time',        v_now,
    'wallets',            v_wallets,
    'new_ledger_entries', v_entries
  );
END;
$$;

REVOKE ALL ON FUNCTION public.pull_wallet_sync(timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pull_wallet_sync(timestamptz) TO authenticated, service_role;
