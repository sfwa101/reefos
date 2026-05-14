/**
 * ThemeGateway — Sovereign boundary for tenant theme DNA (Wave P-3 §12.3).
 *
 * Reads `salsabil_theme_matrix`. UI hooks consume typed VMs only.
 */
import { supabase } from "@/integrations/supabase/client";

export type ThemeDnaPayload = {
  colors?: Record<string, string>;
  effects?: {
    glass?: boolean;
    radius?: string;
    [k: string]: unknown;
  };
};

export type SovereignThemeRow = {
  id: string;
  tenant_id: string;
  theme_name: string;
  is_active: boolean;
  dna_payload: ThemeDnaPayload;
};

export const ThemeGateway = {
  async getActiveTheme(tenantId: string): Promise<SovereignThemeRow | null> {
    const { data, error } = await supabase
      .from("salsabil_theme_matrix")
      .select("id, tenant_id, theme_name, is_active, dna_payload")
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .maybeSingle();
    if (error) throw error;
    return (data as SovereignThemeRow | null) ?? null;
  },

  async getPersonaByKey<T = Record<string, unknown>>(personaKey: string): Promise<T | null> {
    const { data, error } = await supabase
      .from("salsabil_persona_matrix")
      .select(
        "id, persona_key, label_ar, icon, theme_overlay, capabilities, role_predicates, is_active, sort_order",
      )
      .eq("persona_key", personaKey)
      .eq("is_active", true)
      .maybeSingle();
    if (error) throw error;
    return (data as unknown as T | null) ?? null;
  },
};

export type ThemeGatewayType = typeof ThemeGateway;
