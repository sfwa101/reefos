/**
 * Metadata exclusion flag readers (Phase 9).
 * ----------------------------------------------------------------
 * Centralised, type-safe accessors so every discount / reward rule
 * speaks the same language about "this product is excluded".
 *
 * Recognised keys on `product.metadata`:
 *   • excludeFromDiscounts: boolean — opt out of ALL discount rules
 *     (loyalty-tier, bulk-quantity, future promo coupons, etc.)
 *   • exclusionMessage:     string  — optional human reason shown in
 *     the cart UI (e.g. "سعر تنافسي خاص").
 */

import type { PricingContext } from "../types";

function meta(
  context: PricingContext,
): Readonly<Record<string, unknown>> | undefined {
  return (context.product as { metadata?: Readonly<Record<string, unknown>> })
    .metadata;
}

export function isExcludedFromDiscounts(context: PricingContext): boolean {
  const m = meta(context);
  return m?.["excludeFromDiscounts"] === true;
}

export function getExclusionMessage(context: PricingContext): string | null {
  const m = meta(context);
  const v = m?.["exclusionMessage"];
  return typeof v === "string" && v.trim().length > 0 ? v.trim() : null;
}
