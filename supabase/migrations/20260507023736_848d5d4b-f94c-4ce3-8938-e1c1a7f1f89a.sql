-- 1. App id enum + orders.app_id
DO $$ BEGIN
  CREATE TYPE public.salsabil_app_id AS ENUM ('reef', 'khalil', 'asrab', 'nabd');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS app_id public.salsabil_app_id NOT NULL DEFAULT 'reef';

CREATE INDEX IF NOT EXISTS orders_app_id_idx ON public.orders(app_id);

-- 2. user_behavior_events
CREATE TABLE IF NOT EXISTS public.user_behavior_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type  TEXT NOT NULL,
  app_id      public.salsabil_app_id NOT NULL DEFAULT 'reef',
  payload     JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ube_user_idx     ON public.user_behavior_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ube_type_idx     ON public.user_behavior_events(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS ube_app_idx      ON public.user_behavior_events(app_id, created_at DESC);

ALTER TABLE public.user_behavior_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ube_insert_own" ON public.user_behavior_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "ube_select_own" ON public.user_behavior_events
  FOR SELECT USING (auth.uid() = user_id);

-- Admin read-all (uses existing has_role pattern if available)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'has_role') THEN
    EXECUTE $p$
      CREATE POLICY "ube_admin_read_all" ON public.user_behavior_events
        FOR SELECT USING (public.has_role(auth.uid(), 'admin'::app_role))
    $p$;
  END IF;
END $$;

-- 3. Realtime publication
ALTER TABLE public.user_behavior_events REPLICA IDENTITY FULL;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.user_behavior_events;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;