
-- =====================================================================
-- PHASE S — EDGE ASSET REGISTRY, LOYALTY ENGINE & ADMIN KPIS
-- =====================================================================

-- ---------- ACTION 1: media_assets ----------
CREATE TABLE IF NOT EXISTS public.media_assets (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type      text NOT NULL CHECK (entity_type IN ('PRODUCT','CHAT','KYC','VENDOR','BANNER','AVATAR')),
  entity_id        uuid NOT NULL,
  bucket_path      text NOT NULL,
  blurhash_base64  text,
  file_size_bytes  integer,
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_media_assets_entity ON public.media_assets(entity_type, entity_id);

ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "media_select_policy" ON public.media_assets;
CREATE POLICY "media_select_policy" ON public.media_assets
  FOR SELECT
  USING (
    entity_type IN ('PRODUCT','VENDOR','BANNER','AVATAR')
    OR (entity_type = 'KYC' AND auth.uid() IS NOT NULL AND (
         entity_id = auth.uid()
         OR public.has_role(auth.uid(),'admin'::public.app_role)
       ))
    OR (entity_type = 'CHAT' AND auth.uid() IS NOT NULL AND (
         public.is_conversation_participant(entity_id, auth.uid())
         OR public.has_role(auth.uid(),'admin'::public.app_role)
       ))
  );

DROP POLICY IF EXISTS "media_insert_authenticated" ON public.media_assets;
CREATE POLICY "media_insert_authenticated" ON public.media_assets
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "media_admin_write" ON public.media_assets;
CREATE POLICY "media_admin_write" ON public.media_assets
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::public.app_role));

DROP POLICY IF EXISTS "media_admin_delete" ON public.media_assets;
CREATE POLICY "media_admin_delete" ON public.media_assets
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'::public.app_role));

-- ---------- ACTION 2: mint_loyalty_points ----------
-- Uses sentinel uuid for system wallet ownership.
CREATE OR REPLACE FUNCTION public.mint_loyalty_points(p_order_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id     uuid;
  v_total       numeric(18,4);
  v_points      numeric(18,4);
  v_user_wallet uuid;
  v_sys_user    uuid := '00000000-0000-0000-0000-000000000001'::uuid;
  v_sys_wallet  uuid;
  v_group       uuid := gen_random_uuid();
  v_idem        text;
BEGIN
  SELECT user_id, total INTO v_user_id, v_total
    FROM public.orders WHERE id = p_order_id;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'order % not found', p_order_id;
  END IF;

  v_points := floor(COALESCE(v_total,0) / 100.0);
  IF v_points <= 0 THEN
    RETURN NULL;
  END IF;

  -- Resolve / create user reward wallet
  SELECT id INTO v_user_wallet
    FROM public.wallets
   WHERE user_id = v_user_id AND currency = 'REWARD_POINTS';
  IF v_user_wallet IS NULL THEN
    INSERT INTO public.wallets(user_id, currency, balance, status)
    VALUES (v_user_id, 'REWARD_POINTS', 0, 'active')
    RETURNING id INTO v_user_wallet;
  END IF;

  -- Resolve / create platform rewards wallet
  SELECT id INTO v_sys_wallet
    FROM public.wallets
   WHERE user_id = v_sys_user AND currency = 'REWARD_POINTS';
  IF v_sys_wallet IS NULL THEN
    INSERT INTO public.wallets(user_id, currency, balance, status)
    VALUES (v_sys_user, 'REWARD_POINTS', 0, 'active')
    RETURNING id INTO v_sys_wallet;
  END IF;

  v_idem := 'loyalty:' || p_order_id::text;

  -- Balanced ledger pair (Vault Lock from Phase J validates this)
  INSERT INTO public.ledger_entries
    (wallet_id, transaction_group_id, amount, currency, description, idempotency_key, counterparty_wallet_id)
  VALUES
    (v_sys_wallet,  v_group, -v_points, 'REWARD_POINTS', 'mint loyalty points', v_idem || ':sys',  v_user_wallet),
    (v_user_wallet, v_group,  v_points, 'REWARD_POINTS', 'mint loyalty points', v_idem || ':user', v_sys_wallet)
  ON CONFLICT (idempotency_key, wallet_id) DO NOTHING;

  -- Update wallet balances
  UPDATE public.wallets SET balance = balance + v_points WHERE id = v_user_wallet;
  UPDATE public.wallets SET balance = GREATEST(balance - v_points, 0) WHERE id = v_sys_wallet;

  RETURN v_group;
END;
$$;

REVOKE ALL ON FUNCTION public.mint_loyalty_points(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mint_loyalty_points(uuid) TO authenticated, service_role;

-- Allow REWARD_POINTS in wallets currency (no constraint exists currently — skip)

-- ---------- ACTION 3: admin_kpi_snapshots ----------
DROP MATERIALIZED VIEW IF EXISTS public.admin_kpi_snapshots;
CREATE MATERIALIZED VIEW public.admin_kpi_snapshots AS
SELECT
  1::int AS snapshot_id,
  (SELECT count(*) FROM public.profiles) AS total_users,
  (SELECT coalesce(sum(amount),0) FROM public.escrow_payouts WHERE status = 'DISPUTED') AS total_disputed_escrow_funds,
  now() AS refreshed_at;

CREATE UNIQUE INDEX IF NOT EXISTS admin_kpi_snapshots_pk
  ON public.admin_kpi_snapshots(snapshot_id);

REVOKE ALL ON public.admin_kpi_snapshots FROM PUBLIC, anon;
GRANT SELECT ON public.admin_kpi_snapshots TO authenticated;
