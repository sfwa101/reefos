-- Phase 21: Spatio-Temporal Offers Matrix
CREATE TABLE IF NOT EXISTS public.offers_matrix (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  subtitle TEXT,
  block_type TEXT NOT NULL DEFAULT 'flash_sale',
  target_id TEXT,
  priority INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  temporal_context JSONB NOT NULL DEFAULT '{}'::jsonb,
  geo_context JSONB NOT NULL DEFAULT '{}'::jsonb,
  persona_context JSONB NOT NULL DEFAULT '{}'::jsonb,
  logic_weaver_rules JSONB NOT NULL DEFAULT '[]'::jsonb,
  honest_margin_pct NUMERIC(5,2),
  allow_fakka_roundup BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_offers_matrix_active ON public.offers_matrix(is_active);
CREATE INDEX IF NOT EXISTS idx_offers_matrix_priority ON public.offers_matrix(priority DESC);
CREATE INDEX IF NOT EXISTS idx_offers_matrix_block_type ON public.offers_matrix(block_type);

ALTER TABLE public.offers_matrix ENABLE ROW LEVEL SECURITY;

-- Public read of active offers (resolver layer enforces persona/gender/tier filtering)
CREATE POLICY "Active offers are publicly viewable"
  ON public.offers_matrix
  FOR SELECT
  USING (is_active = true);

-- Admin-only writes (relies on existing public.has_role(uuid, app_role))
CREATE POLICY "Admins can insert offers"
  ON public.offers_matrix
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update offers"
  ON public.offers_matrix
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete offers"
  ON public.offers_matrix
  FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Reuse existing public.update_updated_at_column() trigger fn
CREATE TRIGGER update_offers_matrix_updated_at
  BEFORE UPDATE ON public.offers_matrix
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();