
-- =========================================================
-- PHASE 64 — HAKIM GENESIS & SOVEREIGN EVENT FEDERATION
-- =========================================================

-- 1. Ledger DNA enrichment (safe: nullable, no trigger impact)
ALTER TABLE public.ledger_entries
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS merchant_name text,
  ADD COLUMN IF NOT EXISTS tags text[];

CREATE INDEX IF NOT EXISTS idx_ledger_category
  ON public.ledger_entries (category, created_at DESC)
  WHERE category IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ledger_merchant
  ON public.ledger_entries (merchant_name, created_at DESC)
  WHERE merchant_name IS NOT NULL;

-- 2. Hakim user insights store
CREATE TABLE IF NOT EXISTS public.hakim_user_insights (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id text NOT NULL DEFAULT 'wallet',
  severity     text NOT NULL DEFAULT 'info'
               CHECK (severity IN ('info','advisory','warning','critical')),
  kind         text NOT NULL,
  title        text NOT NULL,
  summary      text,
  suggestions  jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at   timestamptz NOT NULL DEFAULT now(),
  read_at      timestamptz
);

CREATE INDEX IF NOT EXISTS idx_hui_user_unread
  ON public.hakim_user_insights (user_id, created_at DESC)
  WHERE read_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_hui_user_workspace
  ON public.hakim_user_insights (user_id, workspace_id, created_at DESC);

ALTER TABLE public.hakim_user_insights ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "hui_owner_read" ON public.hakim_user_insights;
CREATE POLICY "hui_owner_read"
  ON public.hakim_user_insights FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Owner may only update their own row's read_at (dismiss). Other fields stay
-- system-managed; admin overrides flow through SECURITY DEFINER paths.
DROP POLICY IF EXISTS "hui_owner_dismiss" ON public.hakim_user_insights;
CREATE POLICY "hui_owner_dismiss"
  ON public.hakim_user_insights FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "hui_admin_all" ON public.hakim_user_insights;
CREATE POLICY "hui_admin_all"
  ON public.hakim_user_insights FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- No client INSERT policy: insights are written via SECURITY DEFINER RPCs
-- and edge functions only.

-- 3. Federated Sovereign Event Bus
CREATE OR REPLACE FUNCTION public.emit_sovereign_event(
  p_domain  text,
  p_type    text,
  p_payload jsonb DEFAULT '{}'::jsonb,
  p_trace_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_trace uuid := COALESCE(p_trace_id, gen_random_uuid());
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'emit_sovereign_event: unauthenticated' USING ERRCODE = '42501';
  END IF;

  IF p_domain IS NULL OR length(p_domain) = 0
     OR p_type   IS NULL OR length(p_type)   = 0 THEN
    RAISE EXCEPTION 'emit_sovereign_event: domain and type required';
  END IF;

  INSERT INTO public.salsabil_event_timeline
    (trace_id, actor_id, event_domain, event_type, payload)
  VALUES
    (v_trace, auth.uid(), p_domain, p_type, COALESCE(p_payload, '{}'::jsonb))
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.emit_sovereign_event(text, text, jsonb, uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.emit_sovereign_event(text, text, jsonb, uuid) TO authenticated;

-- 4. Hakim financial snapshot (per-user, last N days)
CREATE OR REPLACE FUNCTION public.hakim_user_financial_snapshot(
  p_user_id uuid,
  p_days    int DEFAULT 30
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_since  timestamptz := now() - make_interval(days => GREATEST(p_days, 1));
  v_balance numeric := 0;
  v_income  numeric := 0;
  v_expense numeric := 0;
  v_categories jsonb := '[]'::jsonb;
  v_merchants  jsonb := '[]'::jsonb;
  v_daily      jsonb := '[]'::jsonb;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '42501';
  END IF;

  IF v_caller <> p_user_id AND NOT has_role(v_caller, 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  -- Current balance (sum across all user wallets)
  SELECT COALESCE(SUM(le.amount), 0)
    INTO v_balance
  FROM public.ledger_entries le
  JOIN public.wallets w ON w.id = le.wallet_id
  WHERE w.user_id = p_user_id;

  -- Income / expense over window
  SELECT
    COALESCE(SUM(CASE WHEN le.amount > 0 THEN le.amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN le.amount < 0 THEN -le.amount ELSE 0 END), 0)
  INTO v_income, v_expense
  FROM public.ledger_entries le
  JOIN public.wallets w ON w.id = le.wallet_id
  WHERE w.user_id = p_user_id
    AND le.created_at >= v_since;

  -- Top 8 spending categories
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb)
  INTO v_categories
  FROM (
    SELECT COALESCE(le.category, 'uncategorized') AS category,
           SUM(-le.amount)::numeric AS amount,
           COUNT(*)::int AS count
    FROM public.ledger_entries le
    JOIN public.wallets w ON w.id = le.wallet_id
    WHERE w.user_id = p_user_id
      AND le.created_at >= v_since
      AND le.amount < 0
    GROUP BY COALESCE(le.category, 'uncategorized')
    ORDER BY amount DESC
    LIMIT 8
  ) t;

  -- Top 5 merchants
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb)
  INTO v_merchants
  FROM (
    SELECT le.merchant_name AS merchant,
           SUM(-le.amount)::numeric AS amount,
           COUNT(*)::int AS count
    FROM public.ledger_entries le
    JOIN public.wallets w ON w.id = le.wallet_id
    WHERE w.user_id = p_user_id
      AND le.created_at >= v_since
      AND le.amount < 0
      AND le.merchant_name IS NOT NULL
    GROUP BY le.merchant_name
    ORDER BY amount DESC
    LIMIT 5
  ) t;

  -- Daily series (income/expense per day)
  SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY (t.day)), '[]'::jsonb)
  INTO v_daily
  FROM (
    SELECT date_trunc('day', le.created_at)::date AS day,
           SUM(CASE WHEN le.amount > 0 THEN le.amount ELSE 0 END)::numeric AS income,
           SUM(CASE WHEN le.amount < 0 THEN -le.amount ELSE 0 END)::numeric AS expense
    FROM public.ledger_entries le
    JOIN public.wallets w ON w.id = le.wallet_id
    WHERE w.user_id = p_user_id
      AND le.created_at >= v_since
    GROUP BY 1
  ) t;

  RETURN jsonb_build_object(
    'window_days', p_days,
    'since',       v_since,
    'balance',     v_balance,
    'income',      v_income,
    'expense',     v_expense,
    'savings_velocity', (v_income - v_expense),
    'top_categories',   v_categories,
    'top_merchants',    v_merchants,
    'daily',            v_daily
  );
END;
$$;

REVOKE ALL ON FUNCTION public.hakim_user_financial_snapshot(uuid, int) FROM public;
GRANT EXECUTE ON FUNCTION public.hakim_user_financial_snapshot(uuid, int) TO authenticated;
