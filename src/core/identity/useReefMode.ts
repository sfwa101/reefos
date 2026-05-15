/**
 * useReefMode — Reef Al Madina dual-face toggle.
 *
 * When the Sovereign Switcher activates the "reef" civilization, the admin
 * can flip between two personas:
 *   • "erp"     — operational ERP (orders, inventory, finance…).
 *   • "factory" — App Factory (cashier panels, drivers, modules).
 *
 * Persists in localStorage so reloads keep the chosen face.
 * This store is Reef-scoped; other OS companies should ignore it.
 */
import { create } from "zustand";

export type ReefMode = "erp" | "factory";

const STORAGE_KEY = "salsabil_reef_mode";
const DEFAULT_MODE: ReefMode = "erp";

function readStored(): ReefMode {
  if (typeof window === "undefined") return DEFAULT_MODE;
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    if (v === "erp" || v === "factory") return v;
  } catch {
    /* noop */
  }
  return DEFAULT_MODE;
}

interface ReefModeState {
  mode: ReefMode;
  setMode: (m: ReefMode) => void;
  toggle: () => void;
}

export const useReefMode = create<ReefModeState>((set, get) => ({
  mode: readStored(),
  setMode: (mode: ReefMode) => {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(STORAGE_KEY, mode);
      } catch {
        /* noop */
      }
    }
    set({ mode });
  },
  toggle: () => {
    const next: ReefMode = get().mode === "erp" ? "factory" : "erp";
    get().setMode(next);
  },
}));
