-- Phase 10 — Dynamic business rules.

-- =====================================================
-- 1. Loyalty tier rules (5-tier system, mirrors src/lib/tiers.ts)
-- =====================================================
CREATE TABLE public.loyalty_tier_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tier TEXT NOT NULL UNIQUE
    CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum', 'vip')),
  discount_pct NUMERIC(5, 4) NOT NULL DEFAULT 0
    CHECK (discount_pct >= 0 AND discount_pct <= 0.5),
  points_multiplier NUMERIC(5, 2) NOT NULL DEFAULT 1
    CHECK (points_multiplier >= 0 AND points_multiplier <= 10),
  min_lifetime_spend NUMERIC(12, 2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.loyalty_tier_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read loyalty rules"
  ON public.loyalty_tier_rules FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert loyalty rules"
  ON public.loyalty_tier_rules FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can update loyalty rules"
  ON public.loyalty_tier_rules FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can delete loyalty rules"
  ON public.loyalty_tier_rules FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TRIGGER update_loyalty_tier_rules_updated_at
  BEFORE UPDATE ON public.loyalty_tier_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed defaults (idempotent via ON CONFLICT).
INSERT INTO public.loyalty_tier_rules (tier, discount_pct, points_multiplier, min_lifetime_spend) VALUES
  ('bronze',   0.00, 1.00,    0),
  ('silver',   0.02, 1.25,  500),
  ('gold',     0.04, 1.50, 2000),
  ('platinum', 0.06, 2.00, 5000),
  ('vip',      0.10, 3.00,15000)
ON CONFLICT (tier) DO NOTHING;


-- =====================================================
-- 2. Incentive milestones (cart progress ladder)
-- =====================================================
CREATE TABLE public.incentive_milestones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  threshold NUMERIC(10, 2) NOT NULL CHECK (threshold > 0),
  title TEXT NOT NULL,
  reward TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'Gift',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.incentive_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read milestones"
  ON public.incentive_milestones FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert milestones"
  ON public.incentive_milestones FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can update milestones"
  ON public.incentive_milestones FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can delete milestones"
  ON public.incentive_milestones FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TRIGGER update_incentive_milestones_updated_at
  BEFORE UPDATE ON public.incentive_milestones
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.incentive_milestones (key, threshold, title, reward, icon, sort_order) VALUES
  ('free-delivery',   500,  'توصيل مجاني',    'وفّر رسوم التوصيل',     'Truck',   1),
  ('kitchen-gift',    1500, 'وجبة هدية',       'من مطبخنا الفاخر 🍽️',  'ChefHat', 2),
  ('extra-discount',  3000, 'خصم إضافي ٥٪',   'على كامل السلة',         'Percent', 3)
ON CONFLICT (key) DO NOTHING;