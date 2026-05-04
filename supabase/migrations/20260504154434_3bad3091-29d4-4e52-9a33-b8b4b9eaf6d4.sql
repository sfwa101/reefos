
-- product_bundles
CREATE TABLE public.product_bundles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  subtitle TEXT,
  price_label TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.product_bundles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active bundles" ON public.product_bundles
  FOR SELECT USING (active = true);
CREATE POLICY "Admins manage bundles" ON public.product_bundles
  FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- bundle_items
CREATE TABLE public.bundle_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bundle_id UUID NOT NULL REFERENCES public.product_bundles(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_bundle_items_bundle ON public.bundle_items(bundle_id);
ALTER TABLE public.bundle_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view bundle items" ON public.bundle_items
  FOR SELECT USING (true);
CREATE POLICY "Admins manage bundle items" ON public.bundle_items
  FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- bogo_rules
CREATE TABLE public.bogo_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  product_id TEXT,
  buy_qty INTEGER NOT NULL CHECK (buy_qty > 0),
  get_qty INTEGER NOT NULL CHECK (get_qty > 0),
  get_discount_pct NUMERIC NOT NULL DEFAULT 100 CHECK (get_discount_pct >= 0 AND get_discount_pct <= 100),
  active BOOLEAN NOT NULL DEFAULT true,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.bogo_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active bogo" ON public.bogo_rules
  FOR SELECT USING (active = true);
CREATE POLICY "Admins manage bogo" ON public.bogo_rules
  FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- personalized_offers
CREATE TABLE public.personalized_offers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  product_id TEXT NOT NULL,
  discount_pct NUMERIC NOT NULL CHECK (discount_pct > 0 AND discount_pct <= 100),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_personalized_offers_user ON public.personalized_offers(user_id);
ALTER TABLE public.personalized_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own personalized offers" ON public.personalized_offers
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins manage personalized offers" ON public.personalized_offers
  FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- updated_at triggers
CREATE TRIGGER update_product_bundles_updated_at
  BEFORE UPDATE ON public.product_bundles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bogo_rules_updated_at
  BEFORE UPDATE ON public.bogo_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
