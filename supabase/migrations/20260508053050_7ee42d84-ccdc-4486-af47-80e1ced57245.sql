-- Phase 14 Part 1 — Burn the Ships.
-- Drop the deprecated checkout RPCs. The Sovereign checkout flow is now the
-- single source of truth for order placement.
DROP FUNCTION IF EXISTS public.place_order_atomic(jsonb) CASCADE;
DROP FUNCTION IF EXISTS public.place_order_atomic_v2(jsonb) CASCADE;