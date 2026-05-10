-- ================================================================
-- USA — Universal Salsabil Assets (Wave 1: Spine)
-- ================================================================

-- 1) SECTIONS — الأقسام السيادية الديناميكية
CREATE TABLE public.sections (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug         text NOT NULL UNIQUE,
  name_i18n    jsonb NOT NULL DEFAULT '{}'::jsonb,
  description_i18n jsonb NOT NULL DEFAULT '{}'::jsonb,
  icon         text,
  cover_image  text,
  parent_id    uuid REFERENCES public.sections(id) ON DELETE SET NULL,
  sort_order   integer NOT NULL DEFAULT 0,
  is_active    boolean NOT NULL DEFAULT true,
  metadata     jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_sections_parent  ON public.sections(parent_id);
CREATE INDEX idx_sections_active  ON public.sections(is_active);
CREATE INDEX idx_sections_sort    ON public.sections(sort_order);
ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sections_read_all"   ON public.sections FOR SELECT USING (true);
CREATE POLICY "sections_admin_write" ON public.sections FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER trg_sections_updated_at BEFORE UPDATE ON public.sections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) CAPABILITY REGISTRY — قاموس القدرات
CREATE TABLE public.capability_registry (
  key          text PRIMARY KEY,
  name_i18n    jsonb NOT NULL DEFAULT '{}'::jsonb,
  description_i18n jsonb NOT NULL DEFAULT '{}'::jsonb,
  domain       text NOT NULL DEFAULT 'product',
  schema       jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active    boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.capability_registry ENABLE ROW LEVEL SECURITY;
CREATE POLICY "capability_registry_read_all" ON public.capability_registry FOR SELECT USING (true);
CREATE POLICY "capability_registry_admin_write" ON public.capability_registry FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER trg_capability_registry_updated_at BEFORE UPDATE ON public.capability_registry
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) SECTION_CAPABILITIES — ربط مرن
CREATE TABLE public.section_capabilities (
  section_id     uuid NOT NULL REFERENCES public.sections(id) ON DELETE CASCADE,
  capability_key text NOT NULL REFERENCES public.capability_registry(key) ON DELETE CASCADE,
  config         jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (section_id, capability_key)
);
CREATE INDEX idx_section_caps_section ON public.section_capabilities(section_id);
CREATE INDEX idx_section_caps_cap     ON public.section_capabilities(capability_key);
ALTER TABLE public.section_capabilities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "section_caps_read_all" ON public.section_capabilities FOR SELECT USING (true);
CREATE POLICY "section_caps_admin_write" ON public.section_capabilities FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 4) USA_PRODUCTS — العمود الفقري للمنتج
CREATE TABLE public.usa_products (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                     text NOT NULL UNIQUE,
  sku                      text UNIQUE,
  section_id               uuid NOT NULL REFERENCES public.sections(id) ON DELETE RESTRICT,
  name_i18n                jsonb NOT NULL DEFAULT '{}'::jsonb,
  short_description_i18n   jsonb NOT NULL DEFAULT '{}'::jsonb,
  description_i18n         jsonb NOT NULL DEFAULT '{}'::jsonb,
  story_i18n               jsonb NOT NULL DEFAULT '{}'::jsonb,
  base_price               numeric(14,2) NOT NULL CHECK (base_price >= 0),
  compare_at_price         numeric(14,2) CHECK (compare_at_price IS NULL OR compare_at_price >= 0),
  wholesale_price          numeric(14,2) CHECK (wholesale_price IS NULL OR wholesale_price >= 0),
  member_price             numeric(14,2) CHECK (member_price IS NULL OR member_price >= 0),
  tax_class                text,
  currency                 text NOT NULL DEFAULT 'EGP',
  sale_unit                text NOT NULL DEFAULT 'piece',
  stock_qty                numeric(14,3) NOT NULL DEFAULT 0,
  low_stock_threshold      numeric(14,3) NOT NULL DEFAULT 0,
  is_perishable            boolean NOT NULL DEFAULT false,
  shelf_life_days          integer,
  storage_conditions_i18n  jsonb NOT NULL DEFAULT '{}'::jsonb,
  badges                   text[] NOT NULL DEFAULT ARRAY[]::text[],
  tags                     text[] NOT NULL DEFAULT ARRAY[]::text[],
  attributes               jsonb NOT NULL DEFAULT '{}'::jsonb,
  popularity_score         numeric(8,3) NOT NULL DEFAULT 0,
  rating_avg               numeric(3,2) NOT NULL DEFAULT 0 CHECK (rating_avg >= 0 AND rating_avg <= 5),
  rating_count             integer NOT NULL DEFAULT 0,
  is_active                boolean NOT NULL DEFAULT true,
  is_featured              boolean NOT NULL DEFAULT false,
  seasonal_window          jsonb,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),
  deleted_at               timestamptz
);
CREATE INDEX idx_usa_products_section    ON public.usa_products(section_id);
CREATE INDEX idx_usa_products_active     ON public.usa_products(is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_usa_products_featured   ON public.usa_products(is_featured) WHERE is_featured = true AND deleted_at IS NULL;
CREATE INDEX idx_usa_products_tags       ON public.usa_products USING GIN(tags);
CREATE INDEX idx_usa_products_badges     ON public.usa_products USING GIN(badges);
CREATE INDEX idx_usa_products_attributes ON public.usa_products USING GIN(attributes);
CREATE INDEX idx_usa_products_popularity ON public.usa_products(popularity_score DESC) WHERE is_active = true AND deleted_at IS NULL;
ALTER TABLE public.usa_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "usa_products_read_active" ON public.usa_products FOR SELECT
  USING (deleted_at IS NULL);
CREATE POLICY "usa_products_admin_write" ON public.usa_products FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER trg_usa_products_updated_at BEFORE UPDATE ON public.usa_products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_usa_products_soft_delete BEFORE DELETE ON public.usa_products
  FOR EACH ROW EXECUTE FUNCTION public.tg_soft_delete();

-- 5) PRODUCT_MEDIA
CREATE TABLE public.product_media (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id   uuid NOT NULL REFERENCES public.usa_products(id) ON DELETE CASCADE,
  url          text NOT NULL,
  kind         text NOT NULL DEFAULT 'gallery',
  alt_i18n     jsonb NOT NULL DEFAULT '{}'::jsonb,
  width        integer,
  height       integer,
  sort_order   integer NOT NULL DEFAULT 0,
  metadata     jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_product_media_product ON public.product_media(product_id, sort_order);
CREATE INDEX idx_product_media_kind    ON public.product_media(product_id, kind);
ALTER TABLE public.product_media ENABLE ROW LEVEL SECURITY;
CREATE POLICY "product_media_read_all"   ON public.product_media FOR SELECT USING (true);
CREATE POLICY "product_media_admin_write" ON public.product_media FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 6) PRODUCT_VARIANTS_V2 — متغيرات ديناميكية بأبعاد متعددة
CREATE TABLE public.product_variants_v2 (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      uuid NOT NULL REFERENCES public.usa_products(id) ON DELETE CASCADE,
  axis_key        text NOT NULL,
  axis_value      text NOT NULL,
  axis_value_i18n jsonb NOT NULL DEFAULT '{}'::jsonb,
  price_delta     numeric(12,2) NOT NULL DEFAULT 0,
  sku             text,
  stock           numeric(14,3) NOT NULL DEFAULT 0,
  image_url       text,
  is_default      boolean NOT NULL DEFAULT false,
  is_active       boolean NOT NULL DEFAULT true,
  sort_order      integer NOT NULL DEFAULT 0,
  metadata        jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, axis_key, axis_value)
);
CREATE INDEX idx_pvariants_v2_product ON public.product_variants_v2(product_id);
CREATE INDEX idx_pvariants_v2_active  ON public.product_variants_v2(product_id, is_active);
ALTER TABLE public.product_variants_v2 ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pvariants_v2_read_all" ON public.product_variants_v2 FOR SELECT USING (true);
CREATE POLICY "pvariants_v2_admin_write" ON public.product_variants_v2 FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER trg_pvariants_v2_updated_at BEFORE UPDATE ON public.product_variants_v2
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 7) PRODUCT_ADDONS — إضافات قابلة للاختيار
CREATE TABLE public.product_addons (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id   uuid NOT NULL REFERENCES public.usa_products(id) ON DELETE CASCADE,
  group_key    text NOT NULL,
  group_name_i18n jsonb NOT NULL DEFAULT '{}'::jsonb,
  name_i18n    jsonb NOT NULL DEFAULT '{}'::jsonb,
  kind         text NOT NULL DEFAULT 'custom',
  price_delta  numeric(12,2) NOT NULL DEFAULT 0,
  is_required  boolean NOT NULL DEFAULT false,
  max_qty      integer NOT NULL DEFAULT 1,
  sort_order   integer NOT NULL DEFAULT 0,
  is_active    boolean NOT NULL DEFAULT true,
  metadata     jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_product_addons_product ON public.product_addons(product_id, group_key, sort_order);
ALTER TABLE public.product_addons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "product_addons_read_all" ON public.product_addons FOR SELECT USING (true);
CREATE POLICY "product_addons_admin_write" ON public.product_addons FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER trg_product_addons_updated_at BEFORE UPDATE ON public.product_addons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 8) PRODUCT_NUTRITION
CREATE TABLE public.product_nutrition (
  product_id     uuid PRIMARY KEY REFERENCES public.usa_products(id) ON DELETE CASCADE,
  per_100g       jsonb NOT NULL DEFAULT '{}'::jsonb,
  per_serving    jsonb NOT NULL DEFAULT '{}'::jsonb,
  serving_size_g numeric(10,2),
  allergens      text[] NOT NULL DEFAULT ARRAY[]::text[],
  diet_flags     jsonb NOT NULL DEFAULT '{}'::jsonb,
  ingredients_i18n jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_product_nutrition_allergens ON public.product_nutrition USING GIN(allergens);
ALTER TABLE public.product_nutrition ENABLE ROW LEVEL SECURITY;
CREATE POLICY "product_nutrition_read_all" ON public.product_nutrition FOR SELECT USING (true);
CREATE POLICY "product_nutrition_admin_write" ON public.product_nutrition FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER trg_product_nutrition_updated_at BEFORE UPDATE ON public.product_nutrition
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 9) PRODUCT_RELATIONS — علاقات ذكية
CREATE TABLE public.product_relations (
  product_id    uuid NOT NULL REFERENCES public.usa_products(id) ON DELETE CASCADE,
  related_id    uuid NOT NULL REFERENCES public.usa_products(id) ON DELETE CASCADE,
  relation_type text NOT NULL,
  strength      numeric(5,4) NOT NULL DEFAULT 0.5 CHECK (strength >= 0 AND strength <= 1),
  metadata      jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (product_id, related_id, relation_type),
  CHECK (product_id <> related_id)
);
CREATE INDEX idx_product_relations_product ON public.product_relations(product_id, relation_type);
CREATE INDEX idx_product_relations_related ON public.product_relations(related_id);
ALTER TABLE public.product_relations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "product_relations_read_all" ON public.product_relations FOR SELECT USING (true);
CREATE POLICY "product_relations_admin_write" ON public.product_relations FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));