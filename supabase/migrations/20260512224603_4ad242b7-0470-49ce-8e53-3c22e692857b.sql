-- Phase C2 — Cashier DNA Bridge
-- Read-only view exposing canonical ProductFinancialDNA shape from usa_products.
CREATE OR REPLACE VIEW public.view_product_financial_dna AS
SELECT
  p.id,
  p.base_price,
  COALESCE(p.currency, 'EGP') AS currency,
  p.tax_class,
  jsonb_strip_nulls(jsonb_build_object(
    'compare_at_price', p.compare_at_price,
    'wholesale_price',  p.wholesale_price,
    'member_price',     p.member_price
  )) AS pricing_rules
FROM public.usa_products p
WHERE p.deleted_at IS NULL
  AND p.is_active = true;

GRANT SELECT ON public.view_product_financial_dna TO anon, authenticated;