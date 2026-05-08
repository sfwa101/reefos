-- PHASE 14.4: THE DB MASSACRE — Final Purge of Legacy Order Tables
-- All UI surfaces now read exclusively from salsabil_master_orders and salsabil_fulfillment_nodes.

DROP TABLE IF EXISTS public.order_items CASCADE;
DROP TABLE IF EXISTS public.sub_orders CASCADE;
DROP TABLE IF EXISTS public.orders CASCADE;