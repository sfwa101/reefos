/**
 * defaultLauncher — pure storage helpers for the user-chosen default
 * landing surface (an app card or an admin panel). Read by the root
 * bootstrap to optionally redirect on launch.
 */
export type DefaultLauncher =
  | { kind: "app"; id: string; path: string; name: string }
  | { kind: "panel"; id: string; path: string; name: string };

const KEY = "salsabil.defaultLauncher";

export function readDefaultLauncher(): DefaultLauncher | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as DefaultLauncher;
    if (!v || !v.kind || !v.path) return null;
    return v;
  } catch {
    return null;
  }
}

export function writeDefaultLauncher(v: DefaultLauncher | null): void {
  if (typeof window === "undefined") return;
  try {
    if (v == null) window.localStorage.removeItem(KEY);
    else window.localStorage.setItem(KEY, JSON.stringify(v));
  } catch {
    /* noop */
  }
}

export function isDefaultLauncher(
  current: DefaultLauncher | null,
  candidate: { kind: DefaultLauncher["kind"]; id: string },
): boolean {
  return !!current && current.kind === candidate.kind && current.id === candidate.id;
}
