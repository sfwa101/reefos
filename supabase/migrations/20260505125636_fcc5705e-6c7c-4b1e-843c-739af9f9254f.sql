-- Enable trigram extension for fast ILIKE search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Trigram indexes for free-text product search (ILIKE '%term%')
CREATE INDEX IF NOT EXISTS idx_products_name_trgm
  ON public.products USING gin (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_products_brand_trgm
  ON public.products USING gin (brand gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_products_sub_category_trgm
  ON public.products USING gin (sub_category gin_trgm_ops);

-- Compound index for the paginated storefront feed
CREATE INDEX IF NOT EXISTS idx_products_source_active_sort
  ON public.products (source, is_active, sort_order)
  WHERE is_active = true;