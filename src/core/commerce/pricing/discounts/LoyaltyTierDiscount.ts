/**
 * LoyaltyTierDiscount — Phase 8 (5-tier alignment with `src/lib/tiers.ts`)
 * ----------------------------------------------------------------
 * Cross-cutting discount rule applied AFTER any strategy completes.
 * Reads `context.customerTier` and emits a percentage discount scoped
 * to the line total.
 *
 * Tier table (single source of truth — easy to externalise to a
 * `loyalty_rules` table later):
 *   • guest    → 0%
 *   • bronze   → 0%   (entry tier, no discount but earns points)
 *   • silver   → 2%
 *   • gold     → 4%
 *   • platinum → 6%
 *   • vip      → 10%
 *
 * Why a Rule (not a Strategy modifier): loyalty applies to ANY product
 * regardless of its vertical. Keeping it orthogonal means meat, sweets,
 * wholesale, pharmacy etc. all benefit without each strategy duplicating
 * the table.
 */

import type {
  IDiscountRule,
  PriceBreakdown,
  PricingContext,
  PricingModifier,
} from "../types";
import { isExcludedFromDiscounts } from "../utils/exclusions";
import { liveRules } from "../config/liveRulesCache";

export class LoyaltyTierDiscount implements IDiscountRule {
  readonly key = "loyalty-tier";

  isApplicable(_breakdown: PriceBreakdown, context: PricingContext): boolean {
    if (isExcludedFromDiscounts(context)) return false;
    const tier = context.customerTier;
    if (!tier) return false;
    return liveRules.getTierDiscount(tier) > 0;
  }

  apply(
    _breakdown: PriceBreakdown,
    context: PricingContext,
  ): ReadonlyArray<PricingModifier> {
    const tier = context.customerTier;
    if (!tier) return [];
    const pct = liveRules.getTierDiscount(tier);
    if (pct <= 0) return [];

    return [
      {
        id: `loyalty:${tier}`,
        label: `خصم ولاء (${tier.toUpperCase()} • ${Math.round(pct * 100)}%)`,
        kind: "discount",
        amount: pct,
        percent: true,
        meta: { tier, scope: "line", source: "loyalty-tier" },
      },
    ];
  }
}
