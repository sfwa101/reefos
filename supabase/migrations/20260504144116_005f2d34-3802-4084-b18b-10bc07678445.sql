-- Phase 13.1 — Multi-Fulfillment & Pre-order Architecture

-- 1) orders: financial header extensions
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS tip_amount numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS charity_amount numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS charity_cause_id text,
  ADD COLUMN IF NOT EXISTS is_gift boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS gift_message text,
  ADD COLUMN IF NOT EXISTS upfront_payment_required numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS upfront_payment_collected numeric(12,2) NOT NULL DEFAULT 0;

DO $$ BEGIN
  ALTER TABLE public.orders
    ADD CONSTRAINT orders_upfront_collected_chk
    CHECK (upfront_payment_collected >= 0
       AND upfront_payment_collected <= upfront_payment_required + 0.01);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2) fulfillment_status enum
DO $$ BEGIN
  CREATE TYPE public.fulfillment_status AS ENUM
    ('pending','preparing','ready','out_for_delivery','delivered','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3) fulfillments table
CREATE TABLE IF NOT EXISTS public.fulfillments (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id            uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  sequence            smallint NOT NULL DEFAULT 1,
  status              public.fulfillment_status NOT NULL DEFAULT 'pending',
  delivery_method_id  uuid REFERENCES public.delivery_methods(id) ON DELETE SET NULL,
  scheduled_for       timestamptz,
  eta_minutes         integer,
  driver_id           uuid REFERENCES public.drivers(id) ON DELETE SET NULL,
  tracking_url        text,
  delivery_fee        numeric(12,2) NOT NULL DEFAULT 0,
  notes               text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id, sequence)
);

CREATE INDEX IF NOT EXISTS fulfillments_order_id_idx     ON public.fulfillments(order_id);
CREATE INDEX IF NOT EXISTS fulfillments_driver_id_idx    ON public.fulfillments(driver_id);
CREATE INDEX IF NOT EXISTS fulfillments_status_idx       ON public.fulfillments(status);
CREATE INDEX IF NOT EXISTS fulfillments_active_sched_idx ON public.fulfillments(scheduled_for)
  WHERE status NOT IN ('delivered','cancelled');

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.fulfillments_set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_fulfillments_updated_at ON public.fulfillments;
CREATE TRIGGER trg_fulfillments_updated_at
  BEFORE UPDATE ON public.fulfillments
  FOR EACH ROW EXECUTE FUNCTION public.fulfillments_set_updated_at();

-- RLS
ALTER TABLE public.fulfillments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users_Read_Own_Fulfillments" ON public.fulfillments;
CREATE POLICY "Users_Read_Own_Fulfillments" ON public.fulfillments
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o
                 WHERE o.id = fulfillments.order_id AND o.user_id = auth.uid()));

DROP POLICY IF EXISTS "Admin_Read_Fulfillments" ON public.fulfillments;
CREATE POLICY "Admin_Read_Fulfillments" ON public.fulfillments
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles
                 WHERE user_id = auth.uid() AND role = 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admin_Update_Fulfillments" ON public.fulfillments;
CREATE POLICY "Admin_Update_Fulfillments" ON public.fulfillments
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles
                 WHERE user_id = auth.uid() AND role = 'admin'::public.app_role));

DROP POLICY IF EXISTS "Drivers_Read_Assigned_Fulfillments" ON public.fulfillments;
CREATE POLICY "Drivers_Read_Assigned_Fulfillments" ON public.fulfillments
  FOR SELECT TO authenticated
  USING (driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Drivers_Update_Assigned_Fulfillments" ON public.fulfillments;
CREATE POLICY "Drivers_Update_Assigned_Fulfillments" ON public.fulfillments
  FOR UPDATE TO authenticated
  USING (driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid()));

-- 4) order_items extensions
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS fulfillment_id uuid REFERENCES public.fulfillments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_preorder boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS requires_downpayment boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS order_items_fulfillment_id_idx ON public.order_items(fulfillment_id);