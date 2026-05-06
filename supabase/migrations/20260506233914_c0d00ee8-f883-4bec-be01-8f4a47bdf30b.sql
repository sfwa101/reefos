-- Add line_key column for stable line identity (variant/booking/print signature)
ALTER TABLE public.cart_items
  ADD COLUMN IF NOT EXISTS line_key text NOT NULL DEFAULT '';

-- Backfill: dedupe any existing duplicates by (user_id, product_id, line_key='')
-- keeping the highest qty row.
WITH ranked AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY user_id, product_id, line_key
           ORDER BY qty DESC, updated_at DESC
         ) AS rn
  FROM public.cart_items
)
DELETE FROM public.cart_items c
USING ranked r
WHERE c.id = r.id AND r.rn > 1;

-- Unique constraint enables ON CONFLICT upsert
CREATE UNIQUE INDEX IF NOT EXISTS uq_cart_items_user_product_linekey
  ON public.cart_items (user_id, product_id, line_key);
