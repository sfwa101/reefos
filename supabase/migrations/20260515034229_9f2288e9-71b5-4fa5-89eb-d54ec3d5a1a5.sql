ALTER TABLE public.salsabil_packaging_tiers
  ADD CONSTRAINT salsabil_packaging_tiers_asset_label_unique
  UNIQUE (asset_id, tier_label);