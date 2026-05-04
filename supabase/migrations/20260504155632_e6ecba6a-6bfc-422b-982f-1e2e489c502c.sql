
CREATE TYPE public.rail_frequency_tag AS ENUM ('NONE', 'DAILY_FLASH', 'SEMI_WEEKLY_FRESH', 'WEEKLY_BIG', 'MONTHLY_PANTRY');

ALTER TABLE public.storefront_rails
  ADD COLUMN frequency_tag public.rail_frequency_tag NOT NULL DEFAULT 'NONE';
