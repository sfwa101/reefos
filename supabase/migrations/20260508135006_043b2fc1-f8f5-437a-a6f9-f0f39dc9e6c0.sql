-- Phase 18 Part 1 — Sovereign Persona Matrix
CREATE TABLE IF NOT EXISTS public.salsabil_persona_matrix (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  persona_key text NOT NULL UNIQUE,
  label_ar text NOT NULL,
  icon text,
  theme_overlay jsonb NOT NULL DEFAULT '{}'::jsonb,
  capabilities jsonb NOT NULL DEFAULT '[]'::jsonb,
  role_predicates jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.salsabil_persona_matrix ENABLE ROW LEVEL SECURITY;

-- Public read: persona matrix is non-sensitive UX configuration
CREATE POLICY "persona_matrix_public_read"
ON public.salsabil_persona_matrix
FOR SELECT
USING (true);

-- Admin-only writes
CREATE POLICY "persona_matrix_admin_write"
ON public.salsabil_persona_matrix
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_persona_matrix_updated_at
BEFORE UPDATE ON public.salsabil_persona_matrix
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed: Consumer Face (default warm) + Business Face (corporate navy)
INSERT INTO public.salsabil_persona_matrix
  (persona_key, label_ar, icon, theme_overlay, capabilities, role_predicates, sort_order)
VALUES
  (
    'consumer',
    'واجهة العميل',
    'ShoppingBag',
    '{}'::jsonb,
    '["browse_catalog","place_order","manage_cart","view_wallet"]'::jsonb,
    '{}'::jsonb,
    1
  ),
  (
    'business',
    'واجهة الأعمال',
    'Briefcase',
    '{"colors":{"primary":"220 70% 30%","primary-foreground":"0 0% 98%","background":"222 25% 10%","foreground":"210 20% 96%","card":"222 22% 14%","card-foreground":"210 20% 96%","muted":"222 18% 18%","muted-foreground":"215 14% 70%","accent":"45 90% 55%","border":"222 18% 22%"},"effects":{"radius":"0.5rem","glass":false}}'::jsonb,
    '["manage_products","view_b2b_orders","manage_payouts","view_settlements"]'::jsonb,
    '{"requires_vendor_member":true}'::jsonb,
    2
  )
ON CONFLICT (persona_key) DO NOTHING;