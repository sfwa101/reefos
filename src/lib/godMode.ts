/**
 * God Mode helper — Phase VIII-Dev master flag.
 * Read by hooks to bypass account-linking checks during admin QA.
 */
export const isGodMode = (): boolean => {
  if (typeof window === "undefined") return false;
  const w = window as unknown as { __SALSABIL_GOD_MODE__?: boolean; SALSABIL_GOD_MODE?: boolean };
  if (w.__SALSABIL_GOD_MODE__ || w.SALSABIL_GOD_MODE) return true;
  try {
    return window.localStorage.getItem("salsabil.dev.godMode") === "1";
  } catch {
    return false;
  }
};
