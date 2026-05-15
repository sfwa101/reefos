ALTER TABLE public.salsabil_fulfillment_nodes
  ADD COLUMN IF NOT EXISTS arrived_vendor_at TIMESTAMPTZ;