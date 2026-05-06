
-- ============================================================
-- PHASE D: SUBSCRIPTIONS + MANUFACTURING BOM
-- ============================================================

-- ---------- ACTION 1: SUBSCRIPTIONS ENGINE ----------
CREATE TABLE public.subscription_plans (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_i18n   jsonb NOT NULL DEFAULT '{}'::jsonb,
  frequency   text NOT NULL CHECK (frequency IN ('DAILY','WEEKLY','MONTHLY')),
  base_price  numeric(18,4) NOT NULL CHECK (base_price >= 0),
  status      text NOT NULL DEFAULT 'active'
                CHECK (status IN ('active','inactive','archived')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER subscription_plans_updated_at
  BEFORE UPDATE ON public.subscription_plans
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE public.subscriptions (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id           uuid NOT NULL REFERENCES public.wallets(id) ON DELETE RESTRICT,
  plan_id             uuid NOT NULL REFERENCES public.subscription_plans(id) ON DELETE RESTRICT,
  delivery_address_id uuid NOT NULL REFERENCES public.addresses(id) ON DELETE RESTRICT,
  status              text NOT NULL DEFAULT 'ACTIVE'
                        CHECK (status IN ('ACTIVE','PAUSED','CANCELLED')),
  next_billing_date   timestamptz NOT NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_subscriptions_wallet ON public.subscriptions (wallet_id);
CREATE INDEX idx_subscriptions_due
  ON public.subscriptions (next_billing_date)
  WHERE status = 'ACTIVE';
CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions      ENABLE ROW LEVEL SECURITY;

CREATE POLICY "plans_read_authenticated" ON public.subscription_plans
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "plans_admin_write" ON public.subscription_plans
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "subs_owner_or_admin_read" ON public.subscriptions
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (SELECT 1 FROM public.wallets w
               WHERE w.id = subscriptions.wallet_id AND w.user_id = auth.uid())
  );
CREATE POLICY "subs_owner_insert" ON public.subscriptions
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.wallets w
            WHERE w.id = subscriptions.wallet_id AND w.user_id = auth.uid())
  );
CREATE POLICY "subs_owner_update" ON public.subscriptions
  FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (SELECT 1 FROM public.wallets w
               WHERE w.id = subscriptions.wallet_id AND w.user_id = auth.uid())
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (SELECT 1 FROM public.wallets w
               WHERE w.id = subscriptions.wallet_id AND w.user_id = auth.uid())
  );
CREATE POLICY "subs_admin_delete" ON public.subscriptions
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- ---------- ACTION 2: MANUFACTURING BOM ----------
-- products.id is TEXT in this schema; mirror that for FKs.
CREATE TABLE public.bom_components (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_product_id  text NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  child_product_id   text NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  quantity           numeric(18,6) NOT NULL CHECK (quantity > 0),
  uom                varchar(10) NOT NULL,
  waste_pct          numeric(6,3) NOT NULL DEFAULT 0
                       CHECK (waste_pct >= 0 AND waste_pct < 100),
  created_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (parent_product_id, child_product_id),
  CHECK (parent_product_id <> child_product_id)
);
CREATE INDEX idx_bom_parent ON public.bom_components (parent_product_id);
CREATE INDEX idx_bom_child  ON public.bom_components (child_product_id);

CREATE TABLE public.manufacturing_orders (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      text NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  target_quantity numeric(18,6) NOT NULL CHECK (target_quantity > 0),
  status          text NOT NULL DEFAULT 'DRAFT'
                    CHECK (status IN ('DRAFT','PRODUCTION','COMPLETED','CANCELLED')),
  scheduled_date  date NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_mo_schedule ON public.manufacturing_orders (scheduled_date, status);
CREATE TRIGGER manufacturing_orders_updated_at
  BEFORE UPDATE ON public.manufacturing_orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE public.bom_components        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manufacturing_orders  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bom_admin_all" ON public.bom_components
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "mo_admin_all" ON public.manufacturing_orders
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ---------- ACTION 3: BOM EXPLOSION RPC (RECURSIVE CTE) ----------
CREATE OR REPLACE FUNCTION public.explode_bom(
  p_product_id text,
  p_target_qty numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_result jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '28000';
  END IF;
  IF NOT has_role(v_uid, 'admin'::app_role) THEN
    RAISE EXCEPTION 'admin role required' USING ERRCODE = '42501';
  END IF;
  IF p_target_qty IS NULL OR p_target_qty <= 0 THEN
    RAISE EXCEPTION 'target quantity must be positive' USING ERRCODE = '22023';
  END IF;

  WITH RECURSIVE bom_tree AS (
    -- seed: direct components of the requested product
    SELECT
      b.parent_product_id,
      b.child_product_id,
      (b.quantity * p_target_qty) / (1 - (b.waste_pct / 100.0)) AS required_qty,
      b.uom,
      1 AS depth,
      ARRAY[b.parent_product_id, b.child_product_id] AS path
    FROM public.bom_components b
    WHERE b.parent_product_id = p_product_id

    UNION ALL

    -- recurse: explode each child as if it were a sub-assembly
    SELECT
      b.parent_product_id,
      b.child_product_id,
      (b.quantity * t.required_qty) / (1 - (b.waste_pct / 100.0)) AS required_qty,
      b.uom,
      t.depth + 1,
      t.path || b.child_product_id
    FROM public.bom_components b
    JOIN bom_tree t ON t.child_product_id = b.parent_product_id
    WHERE NOT (b.child_product_id = ANY (t.path))   -- cycle guard
      AND t.depth < 32                              -- depth guard
  ),
  -- only leaves (children that are NOT themselves parents) are raw materials
  leaves AS (
    SELECT t.child_product_id, t.required_qty, t.uom
    FROM bom_tree t
    WHERE NOT EXISTS (
      SELECT 1 FROM public.bom_components b
      WHERE b.parent_product_id = t.child_product_id
    )
  ),
  aggregated AS (
    SELECT
      child_product_id,
      uom,
      SUM(required_qty) AS required_qty
    FROM leaves
    GROUP BY child_product_id, uom
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'child_product_id', child_product_id,
           'required_qty',     required_qty,
           'uom',              uom
         ) ORDER BY child_product_id), '[]'::jsonb)
    INTO v_result
  FROM aggregated;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.explode_bom(text, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.explode_bom(text, numeric) TO authenticated;
