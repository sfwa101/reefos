-- Enable realtime on event timeline
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'salsabil_event_timeline'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.salsabil_event_timeline';
  END IF;
END $$;

ALTER TABLE public.salsabil_event_timeline REPLICA IDENTITY FULL;

-- Hakim pulse cache
CREATE TABLE IF NOT EXISTS public.hakim_pulse_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metrics_hash TEXT NOT NULL UNIQUE,
  page TEXT NOT NULL,
  hour_bucket TIMESTAMPTZ NOT NULL,
  insights JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS hakim_pulse_cache_hour_idx
  ON public.hakim_pulse_cache (page, hour_bucket DESC);

ALTER TABLE public.hakim_pulse_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read hakim pulse cache" ON public.hakim_pulse_cache;
CREATE POLICY "Admins can read hakim pulse cache"
  ON public.hakim_pulse_cache
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can write hakim pulse cache" ON public.hakim_pulse_cache;
CREATE POLICY "Admins can write hakim pulse cache"
  ON public.hakim_pulse_cache
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));