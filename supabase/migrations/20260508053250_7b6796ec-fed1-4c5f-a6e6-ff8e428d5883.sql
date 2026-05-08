-- Phase 14 Part 1 — wire the Sovereign Matrix joins so PostgREST can embed.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'salsabil_fulfillment_items_sku_id_fkey'
      AND conrelid = 'public.salsabil_fulfillment_items'::regclass
  ) THEN
    ALTER TABLE public.salsabil_fulfillment_items
      ADD CONSTRAINT salsabil_fulfillment_items_sku_id_fkey
      FOREIGN KEY (sku_id) REFERENCES public.salsabil_skus(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'salsabil_fulfillment_nodes_master_order_id_fkey'
      AND conrelid = 'public.salsabil_fulfillment_nodes'::regclass
  ) THEN
    ALTER TABLE public.salsabil_fulfillment_nodes
      ADD CONSTRAINT salsabil_fulfillment_nodes_master_order_id_fkey
      FOREIGN KEY (master_order_id) REFERENCES public.salsabil_master_orders(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_salsabil_fulfillment_items_sku_id
  ON public.salsabil_fulfillment_items(sku_id);
CREATE INDEX IF NOT EXISTS idx_salsabil_fulfillment_nodes_master_order_id
  ON public.salsabil_fulfillment_nodes(master_order_id);