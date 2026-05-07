CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE public.salsabil_assets
  ADD COLUMN IF NOT EXISTS semantic_embedding vector(768);

CREATE INDEX IF NOT EXISTS salsabil_assets_semantic_embedding_hnsw
  ON public.salsabil_assets
  USING hnsw (semantic_embedding vector_cosine_ops);

CREATE OR REPLACE FUNCTION public.match_universal_asset(
  p_embedding vector(768),
  p_threshold float DEFAULT 0.85
)
RETURNS TABLE (id uuid, name text, similarity float)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    a.id,
    a.name,
    1 - (a.semantic_embedding <=> p_embedding) AS similarity
  FROM public.salsabil_assets a
  WHERE a.semantic_embedding IS NOT NULL
    AND a.is_active = true
    AND 1 - (a.semantic_embedding <=> p_embedding) >= p_threshold
  ORDER BY a.semantic_embedding <=> p_embedding ASC
  LIMIT 10;
$$;

GRANT EXECUTE ON FUNCTION public.match_universal_asset(vector, float) TO authenticated;