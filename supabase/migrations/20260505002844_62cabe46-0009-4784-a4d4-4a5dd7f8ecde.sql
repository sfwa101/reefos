-- =====================================================================
-- SDUI Enterprise Tables (Phase 16.01)
-- Separate from ui_layouts (which serves store pages) to avoid coupling.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.sdui_layouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  active_version_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sdui_layout_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  layout_id uuid NOT NULL REFERENCES public.sdui_layouts(id) ON DELETE CASCADE,
  version_number integer NOT NULL DEFAULT 1,
  blocks jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  UNIQUE (layout_id, version_number)
);

ALTER TABLE public.sdui_layouts
  ADD CONSTRAINT sdui_layouts_active_version_fk
  FOREIGN KEY (active_version_id) REFERENCES public.sdui_layout_versions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_sdui_versions_layout_status
  ON public.sdui_layout_versions(layout_id, status);

-- updated_at trigger
CREATE TRIGGER trg_sdui_layouts_updated_at
BEFORE UPDATE ON public.sdui_layouts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.sdui_layouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sdui_layout_versions ENABLE ROW LEVEL SECURITY;

-- Public read: anyone can read layouts (only active/published views matter at runtime)
CREATE POLICY "sdui_layouts public read"
  ON public.sdui_layouts FOR SELECT USING (true);

-- Public read: only published versions are visible to non-admins
CREATE POLICY "sdui_versions public read published"
  ON public.sdui_layout_versions FOR SELECT
  USING (status = 'published' OR public.has_role(auth.uid(), 'admin'::app_role));

-- Admin write
CREATE POLICY "sdui_layouts admin insert"
  ON public.sdui_layouts FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "sdui_layouts admin update"
  ON public.sdui_layouts FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "sdui_layouts admin delete"
  ON public.sdui_layouts FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "sdui_versions admin insert"
  ON public.sdui_layout_versions FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "sdui_versions admin update"
  ON public.sdui_layout_versions FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "sdui_versions admin delete"
  ON public.sdui_layout_versions FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- =====================================================================
-- Seed: departments_hub v1
-- =====================================================================
DO $$
DECLARE
  v_layout_id uuid;
  v_version_id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.sdui_layouts WHERE slug = 'departments_hub') THEN
    INSERT INTO public.sdui_layouts (slug, title, description)
    VALUES ('departments_hub', 'مركز الأقسام', 'الواجهة المركزية لكل أقسام ريف المدينة')
    RETURNING id INTO v_layout_id;

    INSERT INTO public.sdui_layout_versions (layout_id, version_number, status, notes, blocks)
    VALUES (
      v_layout_id, 1, 'published', 'Initial seed — mirrors current Sections.tsx',
      '[
        {
          "type": "hero",
          "id": "hero-main",
          "props": {
            "title": "ريف المدينة",
            "subtitle": "كل ما تحتاجه في مكان واحد",
            "tone": "graphite"
          }
        },
        {
          "type": "bento_grid",
          "id": "departments-bento",
          "props": {
            "title": "الأقسام",
            "items": [
              { "key": "supermarket", "title": "السوبرماركت", "subtitle": "كل احتياجاتك", "emoji": "🛒", "to": "/store/supermarket", "size": "wide" },
              { "key": "produce",     "title": "خضار وفاكهة", "subtitle": "طازج",          "emoji": "🥬", "to": "/store/produce",     "size": "tall" },
              { "key": "dairy",       "title": "الألبان",     "subtitle": "كل صباح",        "emoji": "🥛", "to": "/store/dairy",       "size": "half" },
              { "key": "meat",        "title": "الجزارة",     "subtitle": "تقطيع حسب الطلب","emoji": "🥩", "to": "/store/meat",        "size": "half" },
              { "key": "kitchen",     "title": "مطبخ ريف",    "subtitle": "طبخ بيتي",       "emoji": "🍳", "to": "/store/kitchen",     "size": "half" },
              { "key": "sweets",      "title": "الحلويات",    "subtitle": "تورتات",         "emoji": "🍰", "to": "/store/sweets",      "size": "half" },
              { "key": "village",     "title": "من القرية",   "subtitle": "بلدي",           "emoji": "🌾", "to": "/store/village",     "size": "half" },
              { "key": "pharmacy",    "title": "الصيدلية",    "subtitle": "بأمان",          "emoji": "💊", "to": "/store/pharmacy",    "size": "half" },
              { "key": "library",     "title": "مكتبة الطلبة","subtitle": "للدراسة",        "emoji": "📚", "to": "/store/library",     "size": "half" },
              { "key": "homegoods",   "title": "الأدوات",      "subtitle": "للبيت",          "emoji": "🏠", "to": "/store/home",        "size": "half" },
              { "key": "restaurants", "title": "المطاعم",     "subtitle": "ألذ الأطباق",    "emoji": "🍽️","to": "/store/restaurants", "size": "half" }
            ]
          }
        },
        {
          "type": "smart_rail",
          "id": "smart-shopping",
          "props": {
            "title": "تسوق ذكي",
            "items": [
              { "key": "baskets",       "title": "السلال الجاهزة", "emoji": "🧺", "to": "/store/baskets" },
              { "key": "subscriptions", "title": "الاشتراكات",     "emoji": "🔁", "to": "/store/subscription" },
              { "key": "wholesale",     "title": "الجملة",         "emoji": "📦", "to": "/store/wholesale" },
              { "key": "offers",        "title": "العروض",         "emoji": "🎁", "to": "/offers" }
            ]
          }
        }
      ]'::jsonb
    ) RETURNING id INTO v_version_id;

    UPDATE public.sdui_layouts SET active_version_id = v_version_id WHERE id = v_layout_id;
  END IF;
END $$;