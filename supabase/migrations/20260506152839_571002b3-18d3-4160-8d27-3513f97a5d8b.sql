-- ============================================================================
-- PHASE H — DATABASE P99 SURVIVAL
-- ============================================================================
-- All indexes are CREATE INDEX IF NOT EXISTS to keep the migration idempotent.
-- We deliberately skip CONCURRENTLY since migrations run in a transaction.

-- ----------------------------------------------------------------------------
-- 1) Foreign-key B-tree indexes (the 47 audit findings, scoped to tables that
--    actually exist in this schema). Each statement is guarded by to_regclass
--    + pg_attribute lookups so missing tables/columns are silently skipped.
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  t_col record;
BEGIN
  FOR t_col IN
    SELECT * FROM (VALUES
      -- Commerce core
      ('order_items',           'product_id'),
      ('order_items',           'order_id'),
      ('order_items',           'store_id'),
      ('order_items',           'vendor_id'),
      ('orders',                'user_id'),
      ('orders',                'driver_id'),
      ('orders',                'store_id'),
      ('orders',                'address_id'),
      ('orders',                'branch_id'),
      ('products',              'store_id'),
      ('products',              'category_id'),
      ('products',              'vendor_id'),
      ('products',              'brand_id'),
      ('product_units',         'product_id'),
      ('product_batches',       'product_id'),
      ('inventory_locations',   'product_id'),
      ('inventory_locations',   'warehouse_id'),
      ('reviews',               'product_id'),
      ('reviews',               'user_id'),
      ('favorites',             'user_id'),
      ('favorites',             'product_id'),
      -- Settlements / ledger
      ('partner_ledgers',       'order_item_id'),
      ('partner_ledgers',       'partner_id'),
      ('partner_ledgers',       'order_id'),
      ('commission_ledger',     'order_id'),
      ('commission_ledger',     'partner_id'),
      ('vendor_settlements',    'vendor_id'),
      ('store_settlements',     'store_id'),
      ('driver_settlements',    'driver_id'),
      ('driver_cash_settlements','driver_id'),
      ('payouts',               'partner_id'),
      ('expenses',              'branch_id'),
      ('purchases',             'supplier_id'),
      ('purchases',             'branch_id'),
      ('purchase_orders',       'company_id'),
      ('purchase_orders',       'supplier_id'),
      -- Wallet / finance
      ('wallet_transactions',   'user_id'),
      ('wallet_balances',       'user_id'),
      -- Logistics
      ('drivers',               'user_id'),
      ('driver_locations',      'driver_id'),
      -- Social / chat
      ('messages',              'sender_id'),
      ('conversation_participants', 'user_id'),
      -- B2B
      ('company_members',       'user_id'),
      ('company_members',       'company_id'),
      -- Subscriptions
      ('subscriptions',         'user_id'),
      ('subscriptions',         'plan_id'),
      ('subscription_billing_runs', 'subscription_id'),
      -- Mini-apps
      ('mini_app_installations','user_id'),
      ('mini_app_installations','mini_app_id'),
      ('mini_apps',             'developer_id')
    ) AS v(tbl, col)
  LOOP
    IF to_regclass('public.' || t_col.tbl) IS NOT NULL
       AND EXISTS (
         SELECT 1 FROM pg_attribute a
         WHERE a.attrelid = ('public.' || t_col.tbl)::regclass
           AND a.attname = t_col.col
           AND NOT a.attisdropped
       )
    THEN
      EXECUTE format(
        'CREATE INDEX IF NOT EXISTS %I ON public.%I (%I)',
        'idx_' || t_col.tbl || '_' || t_col.col,
        t_col.tbl,
        t_col.col
      );
    END IF;
  END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- 2) RLS initplan caching — wrap auth.uid() as (select auth.uid()) on hot
--    policies. We rebuild only the most-trafficked policies; everything else
--    can be migrated incrementally in later phases.
-- ----------------------------------------------------------------------------

-- profiles: self read/update
DO $$ BEGIN
  IF to_regclass('public.profiles') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
    DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
    DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

    CREATE POLICY "Users can view their own profile"
      ON public.profiles FOR SELECT
      USING (id = (select auth.uid()));
    CREATE POLICY "Users can update their own profile"
      ON public.profiles FOR UPDATE
      USING (id = (select auth.uid()));
    CREATE POLICY "Users can insert their own profile"
      ON public.profiles FOR INSERT
      WITH CHECK (id = (select auth.uid()));
  END IF;
END $$;

-- orders: owner read/insert
DO $$ BEGIN
  IF to_regclass('public.orders') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;
    DROP POLICY IF EXISTS "Users can create their own orders" ON public.orders;

    CREATE POLICY "Users can view their own orders"
      ON public.orders FOR SELECT
      USING (
        user_id = (select auth.uid())
        OR public.has_role((select auth.uid()), 'admin')
      );
    CREATE POLICY "Users can create their own orders"
      ON public.orders FOR INSERT
      WITH CHECK (user_id = (select auth.uid()));
  END IF;
END $$;

-- favorites: owner full access
DO $$ BEGIN
  IF to_regclass('public.favorites') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Users can view their own favorites" ON public.favorites;
    DROP POLICY IF EXISTS "Users can manage their own favorites" ON public.favorites;

    CREATE POLICY "Users can view their own favorites"
      ON public.favorites FOR SELECT
      USING (user_id = (select auth.uid()));
    CREATE POLICY "Users can manage their own favorites"
      ON public.favorites FOR ALL
      USING (user_id = (select auth.uid()))
      WITH CHECK (user_id = (select auth.uid()));
  END IF;
END $$;

-- wallet_balances + wallet_transactions: owner read
DO $$ BEGIN
  IF to_regclass('public.wallet_balances') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Users can view their own wallet" ON public.wallet_balances;
    CREATE POLICY "Users can view their own wallet"
      ON public.wallet_balances FOR SELECT
      USING (user_id = (select auth.uid()));
  END IF;

  IF to_regclass('public.wallet_transactions') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Users can view their own wallet transactions" ON public.wallet_transactions;
    CREATE POLICY "Users can view their own wallet transactions"
      ON public.wallet_transactions FOR SELECT
      USING (user_id = (select auth.uid()));
  END IF;
END $$;
