/**
 * Hakim Layer Store — WAVE UI-6 (Hakim AI Fusion)
 *
 * Lightweight Zustand store that controls the Hakim global overlay mode:
 *   • "closed"  — nothing open
 *   • "command" — the ⌘K command bar (quick actions / nav)
 *   • "panel"   — the side panel chat connected to HakimGateway
 *
 * Constitution v5.1: pure UI state, zero supabase calls, zero business logic.
 */
import { create } from "zustand";

export type HakimMode = "closed" | "command" | "panel";

type HakimLayerState = {
  mode: HakimMode;
  open: (mode: Exclude<HakimMode, "closed">) => void;
  close: () => void;
  toggleCommand: () => void;
  togglePanel: () => void;
};

export const useHakimLayer = create<HakimLayerState>((set) => ({
  mode: "closed",
  open: (mode) => set({ mode }),
  close: () => set({ mode: "closed" }),
  toggleCommand: () =>
    set((s) => ({ mode: s.mode === "command" ? "closed" : "command" })),
  togglePanel: () =>
    set((s) => ({ mode: s.mode === "panel" ? "closed" : "panel" })),
}));
