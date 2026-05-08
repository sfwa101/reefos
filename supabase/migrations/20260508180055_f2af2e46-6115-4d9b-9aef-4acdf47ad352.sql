
-- Phase 29 — Sovereign Unification Strike: seed ui_layouts rows for the
-- newly ascended hub surfaces and category storefronts. Idempotent.
INSERT INTO public.ui_layouts (page_key, section_order, section_config, section_titles, status, is_active, version, title)
VALUES
  ('offers_hub', '["SpatioTemporalOffersRail"]'::jsonb, '{}'::jsonb, '{}'::jsonb, 'published', true, 1, 'صفحة العروض (Sovereign)'),
  ('maeen_hub', '["MaeenLauncherGrid"]'::jsonb, '{}'::jsonb, '{}'::jsonb, 'published', true, 1, 'بوابة معين (Sovereign)'),
  ('category_meat',     '["SearchAndFilters","CategoriesGrid","BundlesRail","BestSellersRail","ProductsGrid"]'::jsonb, '{}'::jsonb, '{}'::jsonb, 'published', true, 1, 'متجر اللحوم'),
  ('category_sweets',   '["SearchAndFilters","CategoriesGrid","BundlesRail","BestSellersRail","ProductsGrid"]'::jsonb, '{}'::jsonb, '{}'::jsonb, 'published', true, 1, 'متجر الحلويات'),
  ('category_pharmacy', '["SearchAndFilters","CategoriesGrid","BundlesRail","BestSellersRail","ProductsGrid"]'::jsonb, '{}'::jsonb, '{}'::jsonb, 'published', true, 1, 'الصيدلية'),
  ('category_kitchen',  '["SearchAndFilters","CategoriesGrid","BundlesRail","BestSellersRail","ProductsGrid"]'::jsonb, '{}'::jsonb, '{}'::jsonb, 'published', true, 1, 'المطبخ'),
  ('category_produce',  '["SearchAndFilters","CategoriesGrid","BundlesRail","BestSellersRail","ProductsGrid"]'::jsonb, '{}'::jsonb, '{}'::jsonb, 'published', true, 1, 'الخضار والفواكه'),
  ('category_recipes',  '["SearchAndFilters","CategoriesGrid","BundlesRail","BestSellersRail","ProductsGrid"]'::jsonb, '{}'::jsonb, '{}'::jsonb, 'published', true, 1, 'الوصفات'),
  ('category_dairy',    '["SearchAndFilters","CategoriesGrid","BundlesRail","BestSellersRail","ProductsGrid"]'::jsonb, '{}'::jsonb, '{}'::jsonb, 'published', true, 1, 'الألبان'),
  ('category_village',  '["SearchAndFilters","CategoriesGrid","BundlesRail","BestSellersRail","ProductsGrid"]'::jsonb, '{}'::jsonb, '{}'::jsonb, 'published', true, 1, 'منتجات القرية')
ON CONFLICT (page_key, status) DO NOTHING;
