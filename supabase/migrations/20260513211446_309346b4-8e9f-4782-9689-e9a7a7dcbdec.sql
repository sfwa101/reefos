
-- ============================================================
-- Phase D-4: Multi-Dimensional Classification Graph
-- ============================================================

-- 1. Vocabulary table
CREATE TABLE public.asset_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_key text NOT NULL,
  tag_value text NOT NULL,
  label_i18n jsonb NOT NULL DEFAULT '{}'::jsonb,
  parent_tag_id uuid NULL REFERENCES public.asset_tags(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT asset_tags_key_value_unique UNIQUE (tag_key, tag_value)
);

CREATE INDEX idx_asset_tags_key ON public.asset_tags(tag_key);
CREATE INDEX idx_asset_tags_parent ON public.asset_tags(parent_tag_id);
CREATE INDEX idx_asset_tags_active ON public.asset_tags(is_active) WHERE is_active = true;

-- 2. Graph membership table
CREATE TABLE public.asset_tag_links (
  asset_id uuid NOT NULL REFERENCES public.salsabil_assets(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.asset_tags(id) ON DELETE CASCADE,
  weight numeric(10,4) NOT NULL DEFAULT 1,
  assigned_by uuid NULL,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (asset_id, tag_id)
);

CREATE INDEX idx_asset_tag_links_tag ON public.asset_tag_links(tag_id);
CREATE INDEX idx_asset_tag_links_asset ON public.asset_tag_links(asset_id);

-- 3. updated_at trigger for asset_tags
CREATE TRIGGER trg_asset_tags_updated_at
BEFORE UPDATE ON public.asset_tags
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Cycle-prevention trigger for parent_tag_id
CREATE OR REPLACE FUNCTION public.asset_tags_prevent_cycle()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  cur uuid;
  hops int := 0;
BEGIN
  IF NEW.parent_tag_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.parent_tag_id = NEW.id THEN
    RAISE EXCEPTION 'asset_tags: tag cannot be its own parent';
  END IF;

  cur := NEW.parent_tag_id;
  WHILE cur IS NOT NULL LOOP
    hops := hops + 1;
    IF hops > 50 THEN
      RAISE EXCEPTION 'asset_tags: parent chain too deep (>50)';
    END IF;
    IF cur = NEW.id THEN
      RAISE EXCEPTION 'asset_tags: cycle detected in parent_tag_id chain';
    END IF;
    SELECT parent_tag_id INTO cur FROM public.asset_tags WHERE id = cur;
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_asset_tags_prevent_cycle
BEFORE INSERT OR UPDATE OF parent_tag_id ON public.asset_tags
FOR EACH ROW
EXECUTE FUNCTION public.asset_tags_prevent_cycle();

-- 5. RLS
ALTER TABLE public.asset_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_tag_links ENABLE ROW LEVEL SECURITY;

-- asset_tags: public read (active), admin write
CREATE POLICY "asset_tags_public_read"
ON public.asset_tags
FOR SELECT
USING (is_active = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "asset_tags_admin_insert"
ON public.asset_tags
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "asset_tags_admin_update"
ON public.asset_tags
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "asset_tags_admin_delete"
ON public.asset_tags
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- asset_tag_links: public read, admin write
CREATE POLICY "asset_tag_links_public_read"
ON public.asset_tag_links
FOR SELECT
USING (true);

CREATE POLICY "asset_tag_links_admin_insert"
ON public.asset_tag_links
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "asset_tag_links_admin_update"
ON public.asset_tag_links
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "asset_tag_links_admin_delete"
ON public.asset_tag_links
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
