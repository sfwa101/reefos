-- Ensure full row data is broadcast so subscribers can match deletes/updates by id.
ALTER TABLE public.cart_items REPLICA IDENTITY FULL;

-- Add cart_items to the realtime publication (idempotent — guard with DO block).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'cart_items'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.cart_items;
  END IF;
END $$;