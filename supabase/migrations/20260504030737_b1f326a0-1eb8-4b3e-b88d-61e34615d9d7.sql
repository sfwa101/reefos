-- Phase 8: Loyalty & Rewards Protocol
-- Add loyalty_tier to profiles (5-tier system aligned with src/lib/tiers.ts)

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'loyalty_tier'
  ) THEN
    CREATE TYPE public.loyalty_tier AS ENUM ('bronze','silver','gold','platinum','vip');
  END IF;
END$$;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS loyalty_tier public.loyalty_tier NOT NULL DEFAULT 'bronze',
  ADD COLUMN IF NOT EXISTS loyalty_points integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS loyalty_lifetime_spend numeric NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS profiles_loyalty_tier_idx ON public.profiles(loyalty_tier);