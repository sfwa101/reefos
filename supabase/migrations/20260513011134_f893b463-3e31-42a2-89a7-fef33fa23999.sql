-- Clean Slate Protocol: add deleted_at columns and soft-delete demo catalog
ALTER TABLE public.salsabil_assets ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.salsabil_skus   ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Soft-delete all currently active physical demo assets
UPDATE public.salsabil_assets
SET is_active = false, deleted_at = NOW(), updated_at = NOW()
WHERE asset_type = 'physical' AND is_active = true;

-- Soft-delete every SKU whose parent asset is now soft-deleted
UPDATE public.salsabil_skus s
SET is_active = false, deleted_at = NOW(), updated_at = NOW()
FROM public.salsabil_assets a
WHERE s.asset_id = a.id
  AND a.deleted_at IS NOT NULL
  AND s.is_active = true;