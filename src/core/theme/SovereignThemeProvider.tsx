/**
 * SovereignThemeProvider — Phase 17 Part 1.
 *
 * Wraps the app and runs `useSovereignTheme`, which streams the active
 * tenant theme from `salsabil_theme_matrix` and injects its DNA payload
 * onto `document.documentElement` as CSS variables. Exposes the active
 * theme + tenant id to descendants for future per-section overrides.
 *
 * Eventually replaces the legacy `ThemeContext` color-preset logic.
 */
import { createContext, useContext, type ReactNode } from "react";
import {
  useSovereignTheme,
  type SovereignTheme,
} from "@/core-os/theme/hooks/useSovereignTheme";

type SovereignThemeContextValue = {
  tenantId: string;
  theme: SovereignTheme | null;
  loading: boolean;
};

const SovereignThemeContext = createContext<SovereignThemeContextValue>({
  tenantId: "reef",
  theme: null,
  loading: true,
});

export function SovereignThemeProvider({
  tenantId = "reef",
  children,
}: {
  tenantId?: string;
  children: ReactNode;
}) {
  const { theme, loading } = useSovereignTheme(tenantId);

  return (
    <SovereignThemeContext.Provider value={{ tenantId, theme, loading }}>
      {children}
    </SovereignThemeContext.Provider>
  );
}

export const useSovereignThemeContext = () => useContext(SovereignThemeContext);
