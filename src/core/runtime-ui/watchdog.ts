import { Tracer } from "@/core/system/observability/Tracer";

/**
 * Wave P-0 — DEV Watchdog (Constitution Article 3 enforcement, runtime).
 *
 * This module is a *tripwire*, not a fix. In `import.meta.env.DEV` only it
 * monkey-patches the singleton Supabase browser client so that any call to
 * `supabase.from(...)` originating from a UI-layer stack frame emits a
 * fierce `console.error` citing the violation. Production behavior is
 * unchanged — the patch never installs and never throws.
 *
 * Why a runtime tripwire (in addition to the ESLint rule):
 *  - ESLint catches *imports*; it cannot catch a UI module that reaches
 *    Supabase via a re-export, a hook chain, or a transitive helper.
 *  - The watchdog inspects the live call stack at the moment `from()` is
 *    invoked, so it surfaces violations the static analyzer misses.
 *
 * SAFE BY CONSTRUCTION:
 *  - No-op when `import.meta.env.DEV` is false.
 *  - Installs at most once (idempotent).
 *  - Never mutates query results, never throws, never alters return values.
 *  - `client.ts` is auto-generated and MUST NOT be edited; this watchdog is
 *    wired in via a side-effect import at app bootstrap (`__root.tsx`).
 *
 * Constitutional reference: SYSTEM_CONSTITUTION.md Article 3 (Universal
 * Prohibitions) and Article 3a (Anti-Hardcoding Law).
 */

const UI_LAYER_PATTERNS = [
  "/src/components/",
  "/src/pages/",
  "/src/apps/",
  "/src/modules/",
  // hooks consumed by UI — broader than UI itself, but a hook that calls
  // supabase.from is a Constitution violation regardless of who imports it.
  "/src/hooks/",
];

const SANCTIONED_LAYER_PATTERNS = [
  "/src/core/",          // gateways, kernel, runtime-ui (sanctioned)
  "/src/integrations/",  // generated supabase clients
  ".functions.ts",       // server functions
  ".server.ts",          // server-only modules
];

let installed = false;

function isUiCaller(stack: string | undefined): boolean {
  if (!stack) return false;
  // Walk frames; first frame inside UI_LAYER_PATTERNS that isn't in a
  // sanctioned layer counts as a violation.
  const frames = stack.split("\n");
  for (const frame of frames) {
    if (SANCTIONED_LAYER_PATTERNS.some((p) => frame.includes(p))) continue;
    if (UI_LAYER_PATTERNS.some((p) => frame.includes(p))) return true;
  }
  return false;
}

/**
 * Manual assertion — call from any code path that wants to declare
 * "this site MUST NOT reach the DB directly from UI". Logs only in DEV.
 */
export function assertNoDirectSupabaseInUI(context?: string): void {
  if (!import.meta.env?.DEV) return;
  const stack = new Error().stack;
  if (!isUiCaller(stack)) return;
  // eslint-disable-next-line no-console
  Tracer.error("runtime-ui", "log", { args: ["🛑 Constitution Article 3 Violation: Direct DB access from UI" +
          (context ? ` — ${context}` : "") +
          "\n   UI layers (components/pages/apps/hooks/modules) MUST go through" +
          " a domain gateway (e.g. catalogGateway) or a server function." +
          "\n   See docs/constitution/SYSTEM_CONSTITUTION.md §3."] });
}

type SupabaseLike = {
  from: (...args: unknown[]) => unknown;
};

/**
 * Idempotent installer. Wraps `supabase.from` so every invocation runs the
 * UI-caller check first. Safe in SSR (window-free) — only the patch site
 * matters; the wrapped call still proxies to the original implementation.
 */
export function installSupabaseUiWatchdog(client: unknown): void {
  if (installed) return;
  if (!import.meta.env?.DEV) return;
  const c = client as SupabaseLike;
  if (!c || typeof c.from !== "function") return;
  const original = c.from.bind(c);
  c.from = ((...args: unknown[]) => {
    assertNoDirectSupabaseInUI(`supabase.from(${String(args[0] ?? "?")})`);
    return original(...args);
  }) as SupabaseLike["from"];
  installed = true;
}
