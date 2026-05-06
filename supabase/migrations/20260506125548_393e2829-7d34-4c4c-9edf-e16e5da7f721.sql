-- ============================================================
-- PHASE A — Dynamic Admin Foundation (EAV + SDUI Registry)
-- ============================================================

-- Reusable updated_at trigger (idempotent)
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ------------------------------------------------------------
-- 1. entity_definitions
-- ------------------------------------------------------------
CREATE TABLE public.entity_definitions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key             TEXT NOT NULL UNIQUE,
  label_i18n      JSONB NOT NULL DEFAULT '{}'::jsonb,
  icon            TEXT,
  table_name      TEXT NOT NULL,
  primary_key_col TEXT NOT NULL DEFAULT 'id',
  is_system       BOOLEAN NOT NULL DEFAULT false,
  description     TEXT,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_entity_definitions_key ON public.entity_definitions(key);

ALTER TABLE public.entity_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read entity_definitions"
  ON public.entity_definitions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins insert entity_definitions"
  ON public.entity_definitions FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update entity_definitions"
  ON public.entity_definitions FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete non-system entity_definitions"
  ON public.entity_definitions FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') AND is_system = false);

CREATE TRIGGER trg_entity_definitions_updated
  BEFORE UPDATE ON public.entity_definitions
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ------------------------------------------------------------
-- 2. entity_attributes
-- ------------------------------------------------------------
CREATE TABLE public.entity_attributes (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id        UUID NOT NULL REFERENCES public.entity_definitions(id) ON DELETE CASCADE,
  key              TEXT NOT NULL,
  label_i18n       JSONB NOT NULL DEFAULT '{}'::jsonb,
  data_type        TEXT NOT NULL,            -- text|number|boolean|date|timestamp|uuid|jsonb|enum|relation
  ui_widget        TEXT NOT NULL,            -- input|textarea|number|switch|select|multiselect|date|json|relation|image|markdown
  validation_jsonb JSONB NOT NULL DEFAULT '{}'::jsonb,
  options_jsonb    JSONB NOT NULL DEFAULT '{}'::jsonb,
  sort_order       INTEGER NOT NULL DEFAULT 0,
  is_required      BOOLEAN NOT NULL DEFAULT false,
  is_searchable    BOOLEAN NOT NULL DEFAULT false,
  is_filterable    BOOLEAN NOT NULL DEFAULT false,
  is_listable      BOOLEAN NOT NULL DEFAULT true,
  role_visibility  TEXT[] NOT NULL DEFAULT ARRAY['admin']::text[],
  help_i18n        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (entity_id, key)
);
CREATE INDEX idx_entity_attributes_entity      ON public.entity_attributes(entity_id);
CREATE INDEX idx_entity_attributes_entity_sort ON public.entity_attributes(entity_id, sort_order);

ALTER TABLE public.entity_attributes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read entity_attributes"
  ON public.entity_attributes FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins write entity_attributes"
  ON public.entity_attributes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_entity_attributes_updated
  BEFORE UPDATE ON public.entity_attributes
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ------------------------------------------------------------
-- 3. admin_form_schemas
-- ------------------------------------------------------------
CREATE TABLE public.admin_form_schemas (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id     UUID NOT NULL REFERENCES public.entity_definitions(id) ON DELETE CASCADE,
  mode          TEXT NOT NULL CHECK (mode IN ('create','edit','view','list')),
  schema_jsonb  JSONB NOT NULL DEFAULT '{}'::jsonb,
  version       INTEGER NOT NULL DEFAULT 1,
  active        BOOLEAN NOT NULL DEFAULT true,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_admin_form_schemas_entity_mode_active
  ON public.admin_form_schemas(entity_id, mode, active);
-- Only one active schema per (entity, mode)
CREATE UNIQUE INDEX uq_admin_form_schemas_active
  ON public.admin_form_schemas(entity_id, mode)
  WHERE active = true;

ALTER TABLE public.admin_form_schemas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read admin_form_schemas"
  ON public.admin_form_schemas FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins write admin_form_schemas"
  ON public.admin_form_schemas FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_admin_form_schemas_updated
  BEFORE UPDATE ON public.admin_form_schemas
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ------------------------------------------------------------
-- 4. admin_navigation
-- ------------------------------------------------------------
CREATE TABLE public.admin_navigation (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id      UUID REFERENCES public.admin_navigation(id) ON DELETE CASCADE,
  entity_id      UUID REFERENCES public.entity_definitions(id) ON DELETE CASCADE,
  label_i18n     JSONB NOT NULL DEFAULT '{}'::jsonb,
  icon           TEXT,
  route_override TEXT,
  role_required  TEXT NOT NULL DEFAULT 'admin',
  sort_order     INTEGER NOT NULL DEFAULT 0,
  is_visible     BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_admin_navigation_parent ON public.admin_navigation(parent_id);
CREATE INDEX idx_admin_navigation_entity ON public.admin_navigation(entity_id);
CREATE INDEX idx_admin_navigation_sort   ON public.admin_navigation(parent_id, sort_order);

ALTER TABLE public.admin_navigation ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read admin_navigation"
  ON public.admin_navigation FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins write admin_navigation"
  ON public.admin_navigation FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_admin_navigation_updated
  BEFORE UPDATE ON public.admin_navigation
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ------------------------------------------------------------
-- 5. admin_actions
-- ------------------------------------------------------------
CREATE TABLE public.admin_actions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id             UUID NOT NULL REFERENCES public.entity_definitions(id) ON DELETE CASCADE,
  key                   TEXT NOT NULL,
  label_i18n            JSONB NOT NULL DEFAULT '{}'::jsonb,
  rpc_name              TEXT NOT NULL,
  args_schema_jsonb     JSONB NOT NULL DEFAULT '{}'::jsonb,
  confirmation_required BOOLEAN NOT NULL DEFAULT false,
  confirmation_text_i18n JSONB NOT NULL DEFAULT '{}'::jsonb,
  role_required         TEXT NOT NULL DEFAULT 'admin',
  scope                 TEXT NOT NULL DEFAULT 'row' CHECK (scope IN ('row','bulk','global')),
  icon                  TEXT,
  sort_order            INTEGER NOT NULL DEFAULT 0,
  is_destructive        BOOLEAN NOT NULL DEFAULT false,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (entity_id, key)
);
CREATE INDEX idx_admin_actions_entity ON public.admin_actions(entity_id);
CREATE INDEX idx_admin_actions_entity_sort ON public.admin_actions(entity_id, sort_order);

ALTER TABLE public.admin_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read admin_actions"
  ON public.admin_actions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins write admin_actions"
  ON public.admin_actions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_admin_actions_updated
  BEFORE UPDATE ON public.admin_actions
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
