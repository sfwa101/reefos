/**
 * SupermarketPricingStrategy — Universal Retail Fallback
 * ----------------------------------------------------------------
 * Catches every retail SKU that doesn't match a specialised strategy
 * (meat, sweets, wholesale). Without this, sources like `pharmacy`,
 * `home`, `dairy`, `produce`, `village`, `baskets`, etc. would have
 * no engine support — `useLivePrice().supported === false` — and the
 * cart adapter falls back to legacy paths, breaking loyalty discounts
 * and reward points for those lines.
 *
 * Behaviour:
 *   • Emits ZERO modifiers — base unit price is used as-is.
 *   • Discount Rules (LoyaltyTierDiscount, BulkQuantityDiscount) and
 *     Reward Rules (PointsEarningRule) still run on top of the empty
 *     modifier set, so VIP discounts and points work everywhere.
 *
 * MUST be registered LAST in `bootstrap.ts` so specialised strategies
 * (meat / sweets / wholesale) win the `canHandle` race. Strategy lookup
 * iterates `Map.values()` in insertion order.
 */

import type {
  IPricingStrategy,
  PricingContext,
  PricingModifier,
  PricingSelection,
} from "../types";

/**
 * Sources that should fall through to the universal retail pipeline
 * when no specialised strategy claims the product.
 *
 * Excluded by design:
 *   • "meat", "sweets", "wholesale" → have dedicated strategies.
 *   • "kitchen", "restaurants", "recipes" → composite/prepared items
 *     priced by their own legacy adapters (kept untouched).
 */
const SUPERMARKET_FALLBACK_SOURCES: ReadonlySet<string> = new Set([
  "supermarket",
  "pharmacy",
  "home",
  "dairy",
  "produce",
  "village",
  "baskets",
  "library",
]);

export type SupermarketSelection = PricingSelection;

export class SupermarketPricingStrategy
  implements IPricingStrategy<SupermarketSelection>
{
  readonly key = "supermarket";

  canHandle(context: PricingContext): boolean {
    const src = context.product.source;
    if (SUPERMARKET_FALLBACK_SOURCES.has(src)) return true;
    // Final safety net — every per-piece SKU we don't recognise still
    // gets discounts + points instead of being silently skipped.
    const unit = context.product.unit?.toLowerCase() ?? "";
    if (unit === "piece" || unit === "قطعة" || unit === "علبة" || unit === "كيس") {
      return true;
    }
    return false;
  }

  buildModifiers(
    _selection: Readonly<SupermarketSelection>,
    _context: PricingContext,
  ): ReadonlyArray<PricingModifier> {
    // No domain-specific modifiers. Base price + downstream discount &
    // reward rules handle the rest.
    return [];
  }
}
