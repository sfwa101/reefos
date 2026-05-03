-- =====================================================================
-- 20260504_init_core_catalog.sql
-- Phase 1: Catalog foundation — schema-only, zero data destruction.
-- Author: Hassan (Principal Architect)
-- =====================================================================

-- 1) product_variants — normalized table for future use.
--    Current code reads variants from products.variants JSONB; this table
--    is additive and does not break existing reads.
CREATE TABLE IF NOT EXISTS public.product_variants (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  text NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  label       text NOT NULL,
  price_delta numeric(12,2) NOT NULL DEFAULT 0,
  sku         text,
  stock       integer NOT NULL DEFAULT 0,
  is_active   boolean NOT NULL DEFAULT true,
  sort_order  integer NOT NULL DEFAULT 0,
  metadata    jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_variants_product
  ON public.product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_active
  ON public.product_variants(is_active);

ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone reads product_variants" ON public.product_variants;
CREATE POLICY "Anyone reads product_variants"
  ON public.product_variants FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins manage product_variants" ON public.product_variants;
CREATE POLICY "Admins manage product_variants"
  ON public.product_variants FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- updated_at trigger (uses existing helper if present)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    DROP TRIGGER IF EXISTS trg_product_variants_updated_at ON public.product_variants;
    CREATE TRIGGER trg_product_variants_updated_at
      BEFORE UPDATE ON public.product_variants
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- =====================================================================
-- 2) Seed categories (top-level = source, children = distinct category text)
-- =====================================================================

-- Top-level groups (one per source). Idempotent via unique-ish name match.
WITH src(slug, name, icon, sort_order) AS (
  VALUES
    ('supermarket', 'السوبرماركت',     '🛒',  10),
    ('produce',     'خضار وفواكه',      '🥬',  20),
    ('dairy',       'ألبان وبيض',       '🥛',  30),
    ('meat',        'لحوم وأسماك',      '🥩',  40),
    ('kitchen',     'المطبخ',           '🍲',  50),
    ('recipes',     'وصفات',            '📖',  60),
    ('restaurants', 'مطاعم',            '🍽️', 70),
    ('sweets',      'حلويات',           '🍰',  80),
    ('baskets',     'سلال',             '🧺',  90),
    ('village',     'منتجات القرية',    '🌾', 100),
    ('pharmacy',    'صيدلية',           '💊', 110),
    ('library',     'مكتبة',            '📚', 120),
    ('home',        'البيت والأجهزة',   '🏠', 130),
    ('wholesale',   'الجملة',           '📦', 140)
)
INSERT INTO public.categories (id, name, parent_id, icon, sort_order, name_i18n)
SELECT gen_random_uuid(), src.name, NULL, src.icon, src.sort_order,
       jsonb_build_object('ar', src.name, 'source_slug', src.slug)
FROM src
WHERE NOT EXISTS (
  SELECT 1 FROM public.categories c
  WHERE c.parent_id IS NULL
    AND (c.name_i18n->>'source_slug') = src.slug
);

-- Sub-categories: one row per distinct (source, category) pair from products.
INSERT INTO public.categories (id, name, parent_id, icon, sort_order, name_i18n)
SELECT
  gen_random_uuid(),
  p.category,
  parent.id,
  NULL,
  100,
  jsonb_build_object('ar', p.category, 'source_slug', p.source)
FROM (
  SELECT DISTINCT source, category
  FROM public.products
  WHERE is_active = true
    AND category IS NOT NULL
    AND category <> ''
) p
JOIN public.categories parent
  ON parent.parent_id IS NULL
 AND (parent.name_i18n->>'source_slug') = p.source
WHERE NOT EXISTS (
  SELECT 1 FROM public.categories c
  WHERE c.parent_id = parent.id
    AND c.name = p.category
);

-- =====================================================================
-- 3) Backfill products.category_id (only where currently NULL).
--    Safe: never overwrites an admin-set category_id.
-- =====================================================================
UPDATE public.products p
SET category_id = c.id
FROM public.categories c
JOIN public.categories parent
  ON parent.id = c.parent_id
WHERE p.category_id IS NULL
  AND parent.parent_id IS NULL
  AND (parent.name_i18n->>'source_slug') = p.source
  AND c.name = p.category;
