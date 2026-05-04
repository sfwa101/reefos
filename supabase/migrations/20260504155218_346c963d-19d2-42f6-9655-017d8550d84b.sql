
CREATE TYPE public.storefront_rail_type AS ENUM ('flash_sale', 'bundle', 'personalized', 'category', 'restaurant', 'sponsored');

CREATE TABLE public.storefront_rails (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type public.storefront_rail_type NOT NULL,
  title TEXT NOT NULL,
  subtitle TEXT,
  target_id UUID,
  sort_order INTEGER NOT NULL DEFAULT 100,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_storefront_rails_active_sort ON public.storefront_rails (is_active, sort_order);

ALTER TABLE public.storefront_rails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active rails"
ON public.storefront_rails FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins manage rails"
ON public.storefront_rails FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_storefront_rails_updated_at
BEFORE UPDATE ON public.storefront_rails
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
