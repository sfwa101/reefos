
DROP FUNCTION IF EXISTS public.process_due_subscriptions() CASCADE;

-- ACTION 1
CREATE OR REPLACE FUNCTION public.assert_ledger_group_balanced()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  net numeric;
  gid uuid;
BEGIN
  gid := COALESCE(NEW.transaction_group_id, OLD.transaction_group_id);
  SELECT COALESCE(SUM(amount), 0) INTO net
  FROM public.ledger_entries
  WHERE transaction_group_id = gid;
  IF net <> 0 THEN
    RAISE EXCEPTION 'Ledger imbalance for transaction_group_id %: net=% (must be 0)', gid, net
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NULL;
END;
$fn$;

DROP TRIGGER IF EXISTS ledger_entries_balanced_check     ON public.ledger_entries;
DROP TRIGGER IF EXISTS ledger_entries_balanced_check_upd ON public.ledger_entries;
DROP TRIGGER IF EXISTS ledger_entries_balanced_check_del ON public.ledger_entries;

CREATE CONSTRAINT TRIGGER ledger_entries_balanced_check
AFTER INSERT ON public.ledger_entries
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW
EXECUTE FUNCTION public.assert_ledger_group_balanced();

CREATE CONSTRAINT TRIGGER ledger_entries_balanced_check_upd
AFTER UPDATE ON public.ledger_entries
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW
EXECUTE FUNCTION public.assert_ledger_group_balanced();

CREATE CONSTRAINT TRIGGER ledger_entries_balanced_check_del
AFTER DELETE ON public.ledger_entries
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW
EXECUTE FUNCTION public.assert_ledger_group_balanced();

-- ACTION 2
CREATE FUNCTION public.process_due_subscriptions()
RETURNS TABLE(processed_count integer, run_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  sub RECORD;
  cnt integer := 0;
  step interval;
BEGIN
  FOR sub IN
    SELECT s.id, s.wallet_id, s.plan_id, s.next_billing_date,
           p.frequency, p.base_price
    FROM public.subscriptions s
    JOIN public.subscription_plans p ON p.id = s.plan_id
    WHERE s.status = 'ACTIVE' AND s.next_billing_date <= now()
    ORDER BY s.next_billing_date
    FOR UPDATE OF s SKIP LOCKED
  LOOP
    step := CASE sub.frequency
              WHEN 'DAILY'   THEN INTERVAL '1 day'
              WHEN 'WEEKLY'  THEN INTERVAL '7 days'
              WHEN 'MONTHLY' THEN INTERVAL '1 month'
              ELSE INTERVAL '1 month'
            END;

    BEGIN
      INSERT INTO public.subscription_billing_runs
        (subscription_id, billed_at, amount, status)
      VALUES (sub.id, now(), sub.base_price, 'PENDING_DEBIT');
    EXCEPTION
      WHEN undefined_table OR undefined_column THEN NULL;
    END;

    UPDATE public.subscriptions
       SET next_billing_date = sub.next_billing_date + step,
           updated_at = now()
     WHERE id = sub.id;

    cnt := cnt + 1;
  END LOOP;

  RETURN QUERY SELECT cnt, now();
END;
$fn$;

REVOKE ALL ON FUNCTION public.process_due_subscriptions() FROM PUBLIC, anon, authenticated;

-- ACTION 3
CREATE OR REPLACE FUNCTION public.calculate_bom_cost(p_product_id text)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  total numeric;
BEGIN
  WITH RECURSIVE explode AS (
    SELECT bc.parent_product_id, bc.child_product_id,
           (bc.quantity * (1 + bc.waste_pct / 100.0))::numeric AS effective_qty,
           1 AS depth,
           ARRAY[bc.parent_product_id, bc.child_product_id]::text[] AS path
    FROM public.bom_components bc
    WHERE bc.parent_product_id = p_product_id
    UNION ALL
    SELECT bc.parent_product_id, bc.child_product_id,
           (e.effective_qty * bc.quantity * (1 + bc.waste_pct / 100.0))::numeric,
           e.depth + 1,
           e.path || bc.child_product_id
    FROM public.bom_components bc
    JOIN explode e ON e.child_product_id = bc.parent_product_id
    WHERE bc.child_product_id <> ALL (e.path) AND e.depth < 32
  ),
  leaves AS (
    SELECT e.child_product_id, e.effective_qty
    FROM explode e
    WHERE NOT EXISTS (
      SELECT 1 FROM public.bom_components b2
      WHERE b2.parent_product_id = e.child_product_id
    )
  )
  SELECT COALESCE(SUM(l.effective_qty * COALESCE(p.cost_price, p.price, 0)), 0)
  INTO total
  FROM leaves l
  JOIN public.products p ON p.id = l.child_product_id;

  RETURN COALESCE(total, 0);
END;
$fn$;

REVOKE ALL ON FUNCTION public.calculate_bom_cost(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.calculate_bom_cost(text) TO authenticated;
