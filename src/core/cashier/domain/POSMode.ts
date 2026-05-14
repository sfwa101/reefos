/**
 * Salsabil OS — Phase 1 · Wave 1
 * Layer 4 (Domain) · POS Mode Resolver — pure capability-driven mapping.
 *
 * Hard invariants:
 *   1. Pure: (capabilities) ⇒ POSMode. No I/O, no clocks, no randomness.
 *   2. Vertical-agnostic: only reads CAP keys, never vertical names.
 *   3. Bytecode-portable: importable from browser AND edge bundles.
 */

import { CAP, type CapabilityKey } from "@/core/capabilities/CapabilityRegistry";

/** Operational mode the POS UI should adopt. */
export type POSMode = "kitchen" | "retail" | "quick_buy" | "hybrid";

export interface POSCapabilityView {
  has(key: CapabilityKey): boolean;
  readonly keys: ReadonlyArray<CapabilityKey>;
}

/** Build a {@link POSCapabilityView} from any iterable of capability keys. */
export function makeCapabilityView(
  keys: Iterable<CapabilityKey>,
): POSCapabilityView {
  const set = new Set<CapabilityKey>(keys);
  return {
    has: (k) => set.has(k),
    keys: Array.from(set),
  };
}

/**
 * Resolve the active {@link POSMode} purely from a capability view.
 * Priority: kitchen ⊕ retail ⇒ hybrid; kitchen alone ⇒ kitchen;
 * retail alone ⇒ retail; quick_buy fallback; otherwise retail default.
 */
export function resolvePOSMode(view: POSCapabilityView): POSMode {
  const kitchen = view.has(CAP.SUPPORTS_KITCHEN_MODE);
  const retail = view.has(CAP.SUPPORTS_BARCODE_SCANNING);
  const quick = view.has(CAP.SUPPORTS_QUICK_BUY) || view.has(CAP.QUICK_BUY);
  if (kitchen && retail) return "hybrid";
  if (kitchen) return "kitchen";
  if (retail) return "retail";
  if (quick) return "quick_buy";
  return "retail";
}
