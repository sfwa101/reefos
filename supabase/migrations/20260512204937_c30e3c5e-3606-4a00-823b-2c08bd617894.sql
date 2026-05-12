-- Phase 1 / Step 1 — Civilization Entity DNA core (additive, non-breaking)
ALTER TABLE public.entity_definitions
  ADD COLUMN IF NOT EXISTS dna_kind text,
  ADD COLUMN IF NOT EXISTS parent_entity_id uuid REFERENCES public.entity_definitions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS capabilities jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_entity_definitions_dna_kind
  ON public.entity_definitions (dna_kind);

CREATE INDEX IF NOT EXISTS idx_entity_definitions_parent
  ON public.entity_definitions (parent_entity_id);

-- Register / upsert the canonical Product entity bound to usa_products.
INSERT INTO public.entity_definitions
  (key, label_i18n, table_name, primary_key_col, is_system, dna_kind, capabilities, sort_order)
VALUES
  ('product',
   '{"ar":"منتج","en":"Product"}'::jsonb,
   'usa_products',
   'id',
   true,
   'product',
   '{}'::jsonb,
   0)
ON CONFLICT (key) DO UPDATE SET
  table_name = EXCLUDED.table_name,
  dna_kind   = EXCLUDED.dna_kind,
  is_system  = true,
  updated_at = now();