
-- ============================================================
-- Phase 1A · Inventory Ledger Foundation
-- Constitution v2.0 · Article 7.1 (Append-Only Stock Ledger)
-- Additive only. Wraps, does not replace, existing inventory tables.
-- ============================================================

-- 1) Append-only ledger of every stock-changing event
CREATE TABLE IF NOT EXISTS public.inventory_ledger_events (
  id              UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_id       UUID NOT NULL,
  location_id     UUID NOT NULL,
  event_type      VARCHAR(24) NOT NULL
                    CHECK (event_type IN ('receive','reserve','commit','release','adjust','spoilage','backorder')),
  delta           NUMERIC(14,3) NOT NULL,
  idempotency_key VARCHAR(128) NOT NULL UNIQUE,
  actor_id        UUID NULL,
  context         JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inv_ledger_entity_loc_time
  ON public.inventory_ledger_events (entity_id, location_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_inv_ledger_event_type
  ON public.inventory_ledger_events (event_type);
CREATE INDEX IF NOT EXISTS idx_inv_ledger_context_gin
  ON public.inventory_ledger_events USING GIN (context);

ALTER TABLE public.inventory_ledger_events ENABLE ROW LEVEL SECURITY;

-- Block direct UPDATE/DELETE — append-only by constitution
CREATE POLICY "ledger_admin_select"
  ON public.inventory_ledger_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "ledger_admin_insert"
  ON public.inventory_ledger_events FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- No UPDATE policy → updates blocked.
-- No DELETE policy → deletes blocked.

-- 2) Reservation lifecycle table
CREATE TABLE IF NOT EXISTS public.inventory_reservations (
  id          UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_ref   VARCHAR(128) NOT NULL,
  state       VARCHAR(16) NOT NULL DEFAULT 'pending'
                CHECK (state IN ('pending','committed','released','expired')),
  expires_at  TIMESTAMPTZ NOT NULL,
  items       JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inv_reservations_order_ref
  ON public.inventory_reservations (order_ref);
CREATE INDEX IF NOT EXISTS idx_inv_reservations_state_expires
  ON public.inventory_reservations (state, expires_at);

ALTER TABLE public.inventory_reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reservations_admin_select"
  ON public.inventory_reservations FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "reservations_admin_insert"
  ON public.inventory_reservations FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "reservations_admin_update"
  ON public.inventory_reservations FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "reservations_admin_delete"
  ON public.inventory_reservations FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- updated_at trigger on reservations
DROP TRIGGER IF EXISTS trg_inv_reservations_updated_at ON public.inventory_reservations;
CREATE TRIGGER trg_inv_reservations_updated_at
  BEFORE UPDATE ON public.inventory_reservations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
