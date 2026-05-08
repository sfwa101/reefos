-- Phase 26 — Sovereign Minimalism: lock the Reef Al-Madina home layout
-- to the five Golden sections in their absolute order, and seed the
-- admin-controlled greeting + neighborhood-pulse settings.

UPDATE public.ui_layouts
SET section_order = '["SmartGreeting","MainSearchHeader","StoryCircles","OfferNeighborhoodPool","PredictiveRefillRail"]'::jsonb,
    section_config = COALESCE(section_config, '{}'::jsonb)
                     - 'AmanahTierProgress'
                     - 'BestSellersRail',
    is_active = true,
    status = 'published'
WHERE page_key = 'reef_home';

-- Seed admin-controlled message engine entries (idempotent).
INSERT INTO public.app_settings (key, value)
VALUES
  ('greeting_subline', '{"enabled": false, "text": ""}'::jsonb),
  ('neighborhood_pulse', '{"enabled": true, "title": "نبض الحي", "body": "اطلب مع جيرانك ووفّر على التوصيل في كل مرة.", "cta_label": "اعرف المزيد", "cta_to": "/offers"}'::jsonb)
ON CONFLICT (key) DO NOTHING;