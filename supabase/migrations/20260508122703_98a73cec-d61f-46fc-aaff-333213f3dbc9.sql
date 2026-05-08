-- Phase 17 Part 1 — The Sovereign DNA Engine (Theme Matrix)
-- Database-driven theme tokens injected as CSS variables at runtime.

CREATE TABLE IF NOT EXISTS public.salsabil_theme_matrix (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL DEFAULT 'reef',
  theme_name text NOT NULL,
  is_active boolean NOT NULL DEFAULT false,
  dna_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- One active theme per tenant.
CREATE UNIQUE INDEX IF NOT EXISTS salsabil_theme_matrix_active_per_tenant
  ON public.salsabil_theme_matrix (tenant_id) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS salsabil_theme_matrix_tenant_idx
  ON public.salsabil_theme_matrix (tenant_id);

-- updated_at trigger
CREATE TRIGGER salsabil_theme_matrix_updated_at
BEFORE UPDATE ON public.salsabil_theme_matrix
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS: themes are public-read (UI must boot for anon visitors), admin-only write.
ALTER TABLE public.salsabil_theme_matrix ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Themes are publicly readable"
  ON public.salsabil_theme_matrix FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert themes"
  ON public.salsabil_theme_matrix FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update themes"
  ON public.salsabil_theme_matrix FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete themes"
  ON public.salsabil_theme_matrix FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Seed: Imperial Sage (Reef Al Madina baseline). All HSL triplets, no hsl() wrapper.
INSERT INTO public.salsabil_theme_matrix (tenant_id, theme_name, is_active, dna_payload)
VALUES (
  'reef',
  'Imperial Sage',
  true,
  jsonb_build_object(
    'colors', jsonb_build_object(
      'background',           '120 30% 98%',
      'foreground',           '150 15% 14%',
      'card',                 '0 0% 100%',
      'card-foreground',      '150 15% 14%',
      'popover',              '0 0% 100%',
      'popover-foreground',   '150 15% 14%',
      'primary',              '142 35% 38%',
      'primary-foreground',   '60 30% 98%',
      'primary-glow',         '138 55% 70%',
      'primary-soft',         '130 45% 92%',
      'secondary',            '130 20% 94%',
      'secondary-foreground', '150 20% 18%',
      'muted',                '140 18% 93%',
      'muted-foreground',     '150 8% 42%',
      'accent',               '36 70% 60%',
      'accent-foreground',    '30 30% 12%',
      'destructive',          '4 78% 56%',
      'destructive-foreground','0 0% 100%',
      'border',               '140 15% 88%',
      'input',                '140 15% 88%',
      'ring',                 '142 35% 38%'
    ),
    'effects', jsonb_build_object(
      'glass',  true,
      'radius', '1.5rem'
    )
  )
)
ON CONFLICT DO NOTHING;