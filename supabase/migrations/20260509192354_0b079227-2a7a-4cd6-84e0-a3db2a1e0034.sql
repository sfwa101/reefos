-- Phase 55: KDS Workspace prep
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'kitchen_staff';

-- Enable realtime publication for fulfillment nodes (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'salsabil_fulfillment_nodes'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.salsabil_fulfillment_nodes';
  END IF;
END $$;

-- Ensure FULL replica identity so realtime carries old/new rows
ALTER TABLE public.salsabil_fulfillment_nodes REPLICA IDENTITY FULL;