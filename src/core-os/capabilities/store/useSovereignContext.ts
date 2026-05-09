/**
 * useSovereignContext — Phase 18 Part 1 + Phase 65 extension.
 *
 * Holds the active persona (visual face) AND the active workspace_id (the
 * Phase 65 contextual capability scope). Persists both in localStorage so
 * morphing survives reloads.
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

export type WorkspaceKind =
  | "reef"
  | "tayseer"
  | "noor_eldin"
  | "family"
  | "global";

const STORAGE_KEY = "salsabil_active_persona";
const WORKSPACE_KEY = "salsabil_active_workspace";
const WORKSPACE_KIND_KEY = "salsabil_active_workspace_kind";
const DEFAULT_PERSONA = "consumer";

function readStoredPersona(): string {
  if (typeof window === "undefined") return DEFAULT_PERSONA;
  try {
    return window.localStorage.getItem(STORAGE_KEY) || DEFAULT_PERSONA;
  } catch {
    return DEFAULT_PERSONA;
  }
}
function readStoredWorkspace(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(WORKSPACE_KEY);
  } catch {
    return null;
  }
}
function readStoredKind(): WorkspaceKind {
  if (typeof window === "undefined") return "global";
  try {
    return (window.localStorage.getItem(WORKSPACE_KIND_KEY) as WorkspaceKind) || "global";
  } catch {
    return "global";
  }
}

type SovereignContextState = {
  activePersonaKey: string;
  activePersonaData: PersonaRow | null;
  activeWorkspaceId: string | null;
  activeWorkspaceKind: WorkspaceKind;
  setPersona: (key: string) => void;
  setPersonaData: (row: PersonaRow | null) => void;
  setActiveWorkspace: (id: string | null, kind?: WorkspaceKind) => void;
};

export const useSovereignContext = create<SovereignContextState>((set) => ({
  activePersonaKey: readStoredPersona(),
  activePersonaData: null,
  activeWorkspaceId: readStoredWorkspace(),
  activeWorkspaceKind: readStoredKind(),
  setPersona: (key: string) => {
    if (typeof window !== "undefined") {
      try { window.localStorage.setItem(STORAGE_KEY, key); } catch { /* noop */ }
    }
    set({ activePersonaKey: key });
  },
  setPersonaData: (row) => set({ activePersonaData: row }),
  setActiveWorkspace: (id, kind) => {
    if (typeof window !== "undefined") {
      try {
        if (id) window.localStorage.setItem(WORKSPACE_KEY, id);
        else window.localStorage.removeItem(WORKSPACE_KEY);
        if (kind) window.localStorage.setItem(WORKSPACE_KIND_KEY, kind);
      } catch { /* noop */ }
    }
    set({
      activeWorkspaceId: id,
      ...(kind ? { activeWorkspaceKind: kind } : {}),
    });
  },
}));
