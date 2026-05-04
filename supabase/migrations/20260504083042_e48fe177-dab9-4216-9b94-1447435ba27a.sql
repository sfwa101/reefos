-- 1) Extend addresses with geo coordinates, recipient info, building details, zone link
ALTER TABLE public.addresses
  ADD COLUMN IF NOT EXISTS lat numeric(10,7),
  ADD COLUMN IF NOT EXISTS lng numeric(10,7),
  ADD COLUMN IF NOT EXISTS building_type text,
  ADD COLUMN IF NOT EXISTS floor text,
  ADD COLUMN IF NOT EXISTS apartment_no text,
  ADD COLUMN IF NOT EXISTS recipient_name text,
  ADD COLUMN IF NOT EXISTS recipient_phone text,
  ADD COLUMN IF NOT EXISTS delivery_instructions text,
  ADD COLUMN IF NOT EXISTS zone_id uuid REFERENCES public.geo_zones(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_addresses_zone_id ON public.addresses(zone_id);
CREATE INDEX IF NOT EXISTS idx_addresses_user_active ON public.addresses(user_id, is_active);

-- Fix the is_default race condition: only ONE default per user
CREATE UNIQUE INDEX IF NOT EXISTS uniq_addresses_one_default_per_user
  ON public.addresses(user_id) WHERE is_default = true;

-- 2) New table: delivery_methods
CREATE TABLE IF NOT EXISTS public.delivery_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name_ar text NOT NULL,
  name_en text NOT NULL,
  fee_multiplier numeric(5,2) NOT NULL DEFAULT 1.0,
  flat_surcharge numeric(10,2) NOT NULL DEFAULT 0,
  base_eta_mins integer NOT NULL DEFAULT 60,
  eta_label_ar text NOT NULL DEFAULT '',
  requires_scheduling boolean NOT NULL DEFAULT false,
  icon text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.delivery_methods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "delivery_methods_read_public" ON public.delivery_methods;
CREATE POLICY "delivery_methods_read_public" ON public.delivery_methods
  FOR SELECT TO anon, authenticated
  USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "delivery_methods_admin_write" ON public.delivery_methods;
CREATE POLICY "delivery_methods_admin_write" ON public.delivery_methods
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP TRIGGER IF EXISTS trg_delivery_methods_updated_at ON public.delivery_methods;
CREATE TRIGGER trg_delivery_methods_updated_at
  BEFORE UPDATE ON public.delivery_methods
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed defaults (idempotent)
INSERT INTO public.delivery_methods (code, name_ar, name_en, fee_multiplier, flat_surcharge, base_eta_mins, eta_label_ar, requires_scheduling, sort_order) VALUES
  ('standard',  'توصيل عادي', 'Standard',  1.00,  0, 60, 'خلال ساعة',         false, 1),
  ('vip',       'VIP سريع',   'VIP Fast',  1.50, 15, 30, 'خلال 30 دقيقة',     false, 2),
  ('scheduled', 'موعد محدد',  'Scheduled', 0.90,  0,  0, 'في الموعد المحدد',  true,  3)
ON CONFLICT (code) DO NOTHING;