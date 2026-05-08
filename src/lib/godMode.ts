/**
 * God Mode helper — Phase 36 Titanium Shield.
 *
 * STRICTLY DEV-ONLY. In production builds (`import.meta.env.DEV === false`),
 * this function ALWAYS returns `false`. The `localStorage` / `window` flag
 * reads are tree-shaken out by Vite when DEV is statically false, so no
 * admin-bypass surface ships in the production bundle.
 */
export const isGodMode = (): boolean => {
  if (!import.meta.env.DEV) return false;
  if (typeof window === "undefined") return false;
  const w = window as unknown as { __SALSABIL_GOD_MODE__?: boolean; SALSABIL_GOD_MODE?: boolean };
  if (w.__SALSABIL_GOD_MODE__ || w.SALSABIL_GOD_MODE) return true;
  try {
    return window.localStorage.getItem("salsabil.dev.godMode") === "1";
  } catch {
    return false;
  }
};
