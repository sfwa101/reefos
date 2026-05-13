-- Scorched Earth: soft-delete every product across legacy + sovereign tables
UPDATE public.usa_products
SET is_active = false, deleted_at = NOW(), updated_at = NOW()
WHERE is_active = true OR deleted_at IS NULL;

UPDATE public.salsabil_assets
SET is_active = false, deleted_at = COALESCE(deleted_at, NOW()), updated_at = NOW()
WHERE is_active = true OR deleted_at IS NULL;

UPDATE public.salsabil_skus
SET is_active = false, deleted_at = COALESCE(deleted_at, NOW()), updated_at = NOW()
WHERE is_active = true OR deleted_at IS NULL;