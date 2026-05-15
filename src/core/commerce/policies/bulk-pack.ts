/**
 * Salsabil OS — Wave P-1.5 · Wholesale Bulk-Pack Synthesis Policy.
 *
 * Layer 4 (Domain). Single source of truth for the "pretend a wholesale
 * variant exists" mock-data factors used by the wholesale comparison
 * surface. Lives in the policy layer so no UI block multiplies a retail
 * price by an arbitrary factor (Law 3 — Presentation Purity).
 *
 * Once a real wholesale catalog lands in the DB this module is the single
 * file to delete; UI consumers stay untouched.
 */

/** Multiplier applied to a retail unit price to derive the bulk-pack price. */
export const BULK_PACK_PRICE_FACTOR = 5.2;

/** Multiplier applied to derive the bulk-pack "compare-at" / strike price. */
export const BULK_PACK_OLD_PRICE_FACTOR = 6;

const round = (n: number): number => Math.round(n);

export interface BulkPackPricing {
  readonly price: number;
  readonly oldPrice: number;
}

/** Synthesise a bulk-pack pricing pair from a retail unit price. */
export function bulkPackPricingFromRetail(retailPrice: number): BulkPackPricing {
  const safe = Number.isFinite(retailPrice) ? Math.max(0, retailPrice) : 0;
  return {
    price: round(safe * BULK_PACK_PRICE_FACTOR),
    oldPrice: round(safe * BULK_PACK_OLD_PRICE_FACTOR),
  };
}
