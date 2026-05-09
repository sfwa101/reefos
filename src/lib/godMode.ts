/**
 * God Mode helper — Phase 36 Titanium Shield, hardened in Phase 43.
 *
 * STRICTLY DEV-ONLY. Every `window` / `localStorage` read is wrapped in
 * `if (import.meta.env.DEV)` so Vite tree-shakes the entire body away in
 * production builds — the function compiles down to `() => false`. There
 * is no admin-bypass surface in the production bundle.
 */
export const isGodMode = (): boolean => {
  if (import.meta.env.DEV) {
    if (typeof window === "undefined") return false;
    const w = window as unknown as { __SALSABIL_GOD_MODE__?: boolean; SALSABIL_GOD_MODE?: boolean };
    if (w.__SALSABIL_GOD_MODE__ || w.SALSABIL_GOD_MODE) return true;
    try {
      return window.localStorage.getItem("salsabil.dev.godMode") === "1";
    } catch {
      return false;
    }
  }
  return false;
};
