/**
 * Khalil — capability gating middleware (P2.3).
 *
 * Server-side gate paired with `requireSupabaseAuth`. Today it enforces:
 *
 *   1. The caller is authenticated (upstream middleware already did this).
 *   2. The requested capability key is a KNOWN member of `KHALIL_CAP`
 *      — unknown keys fail closed (Art. III).
 *
 * Grants storage (the per-user `capability_registry`) lands with the
 * Identity-engine phase; until then every authenticated user implicitly
 * holds every `khalil.*` cap. This middleware is the seam where that
 * lookup will plug in — call sites do not change.
 *
 * UI never imports this. UI never role-checks. Gateways always wrap it.
 */
import { createMiddleware } from "@tanstack/react-start";
import { KHALIL_CAP, type KhalilCapabilityKey } from "../capabilities";

const REGISTERED_CAPS: ReadonlySet<string> = new Set(Object.values(KHALIL_CAP));

export function requireKhalilCapability(cap: KhalilCapabilityKey) {
  return createMiddleware({ type: "function" }).server(async ({ next }) => {
    if (!REGISTERED_CAPS.has(cap)) {
      throw new Response(`Forbidden: unknown capability ${cap}`, { status: 403 });
    }
    // Future: lookup grants for `context.userId` and reject when missing.
    return next({ context: { khalilCap: cap } });
  });
}
