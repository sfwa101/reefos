/**
 * useSovereignTheme — Phase 17 Part 1.
 *
 * Reads the active theme row from `salsabil_theme_matrix` for the current
 * tenant and injects its `dna_payload.colors` map as CSS variables on
 * `document.documentElement`. Effects (radius, glass) are projected the
 * same way so any token can flow from the DB without code changes.
 *
 * Tenant is hardcoded to `reef` for now; Phase 17 Part 2 wires it through
 * the SovereignThemeProvider context.
 */
import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  useSovereignContext,
  type PersonaRow,
} from "@/core-os/capabilities/store/useSovereignContext";

export type ThemeDnaPayload = {
  colors?: Record<string, string>;
  effects?: {
    glass?: boolean;
    radius?: string;
    [k: string]: unknown;
  };
};

export type SovereignTheme = {
  id: string;
  tenant_id: string;
  theme_name: string;
  is_active: boolean;
  dna_payload: ThemeDnaPayload;
};

export const SOVEREIGN_THEME_QUERY_KEY = ["sovereign-theme"] as const;

async function fetchActiveTheme(tenantId: string): Promise<SovereignTheme | null> {
  const { data, error } = await supabase
    .from("salsabil_theme_matrix")
    .select("id, tenant_id, theme_name, is_active, dna_payload")
    .eq("tenant_id", tenantId)
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw error;
  return (data as SovereignTheme | null) ?? null;
}

/** Apply a DNA payload to document.documentElement as inline CSS vars. */
function injectDna(payload: ThemeDnaPayload | undefined) {
  if (typeof document === "undefined" || !payload) return;
  const root = document.documentElement;
  const colors = payload.colors ?? {};
  for (const [key, value] of Object.entries(colors)) {
    if (typeof value === "string") root.style.setProperty(`--${key}`, value);
  }
  const effects = payload.effects ?? {};
  if (typeof effects.radius === "string") {
    root.style.setProperty("--radius", effects.radius);
  }
  if (typeof effects.glass === "boolean") {
    root.dataset.glass = effects.glass ? "on" : "off";
  }
}

/** Fetch the persona row matching the active key (Phase 18 Part 1). */
async function fetchPersona(personaKey: string): Promise<PersonaRow | null> {
  const { data, error } = await supabase
    .from("salsabil_persona_matrix")
    .select(
      "id, persona_key, label_ar, icon, theme_overlay, capabilities, role_predicates, is_active, sort_order",
    )
    .eq("persona_key", personaKey)
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as PersonaRow | null) ?? null;
}

/** Deep-merge persona overlay on top of base DNA (colors + effects). */
function mergeDna(
  base: ThemeDnaPayload | undefined,
  overlay: PersonaRow["theme_overlay"] | undefined,
): ThemeDnaPayload {
  return {
    colors: { ...(base?.colors ?? {}), ...(overlay?.colors ?? {}) },
    effects: { ...(base?.effects ?? {}), ...(overlay?.effects ?? {}) },
  };
}

export function useSovereignTheme(tenantId: string = "reef") {
  const themeQuery = useQuery({
    queryKey: [...SOVEREIGN_THEME_QUERY_KEY, tenantId],
    queryFn: () => fetchActiveTheme(tenantId),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const activePersonaKey = useSovereignContext((s) => s.activePersonaKey);
  const setPersonaData = useSovereignContext((s) => s.setPersonaData);

  const personaQuery = useQuery({
    queryKey: ["sovereign-persona", activePersonaKey],
    queryFn: () => fetchPersona(activePersonaKey),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  // Hydrate the Zustand store with the resolved persona row.
  useEffect(() => {
    setPersonaData(personaQuery.data ?? null);
  }, [personaQuery.data, setPersonaData]);

  const mergedDna = useMemo(
    () => mergeDna(themeQuery.data?.dna_payload, personaQuery.data?.theme_overlay),
    [themeQuery.data, personaQuery.data],
  );

  // Inject merged DNA whenever base theme OR active persona changes.
  useEffect(() => {
    injectDna(mergedDna);
  }, [mergedDna]);

  return {
    theme: themeQuery.data ?? null,
    loading: themeQuery.isLoading,
    error: themeQuery.error as Error | null,
    persona: personaQuery.data ?? null,
    activePersonaKey,
  };
}
