/**
 * useSovereignContext — Phase 18 Part 1.
 *
 * The Sovereign Persona runtime store. Holds the active persona key and the
 * full DB row of the active persona (label, icon, theme_overlay, capabilities,
 * role_predicates). The choice persists in localStorage under
 * `salsabil_active_persona` so reloads keep the same face.
 *
 * The Theme DNA layer (`useSovereignTheme`) subscribes to `activePersonaData`
 * and merges its `theme_overlay` on top of the base tenant theme — no reload,
 * no logout, instant face morphing.
 */
import { create } from "zustand";

export type PersonaRow = {
  id: string;
  persona_key: string;
  label_ar: string;
  icon: string | null;
  theme_overlay: {
    colors?: Record<string, string>;
    effects?: { glass?: boolean; radius?: string; [k: string]: unknown };
  };
  capabilities: string[];
  role_predicates: Record<string, unknown>;
  is_active: boolean;
  sort_order: number;
};

const STORAGE_KEY = "salsabil_active_persona";
const DEFAULT_PERSONA = "consumer";

function readStoredPersona(): string {
  if (typeof window === "undefined") return DEFAULT_PERSONA;
  try {
    return window.localStorage.getItem(STORAGE_KEY) || DEFAULT_PERSONA;
  } catch {
    return DEFAULT_PERSONA;
  }
}

type SovereignContextState = {
  activePersonaKey: string;
  activePersonaData: PersonaRow | null;
  setPersona: (key: string) => void;
  setPersonaData: (row: PersonaRow | null) => void;
};

export const useSovereignContext = create<SovereignContextState>((set) => ({
  activePersonaKey: readStoredPersona(),
  activePersonaData: null,
  setPersona: (key: string) => {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(STORAGE_KEY, key);
      } catch {
        /* ignore storage errors */
      }
    }
    set({ activePersonaKey: key });
  },
  setPersonaData: (row) => set({ activePersonaData: row }),
}));
