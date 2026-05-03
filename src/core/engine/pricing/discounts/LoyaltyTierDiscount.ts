/**
 * LoyaltyTierDiscount
 * ----------------------------------------------------------------
 * Cross-cutting discount rule applied AFTER any strategy completes.
 * Reads `context.customerTier` and emits a percentage discount scoped
 * to the line total.
 *
 * Tier table (single source of truth — easy to externalise later):
 *   • guest  → 0%
 *   • member → 2%
 *   • vip    → 5%
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

const TIER_PCT: Readonly<Record<NonNullable<PricingContext["customerTier"]>, number>> = {
  guest: 0,
  member: 0.02,
  vip: 0.05,
};

export class LoyaltyTierDiscount implements IDiscountRule {
  readonly key = "loyalty-tier";

  isApplicable(_breakdown: PriceBreakdown, context: PricingContext): boolean {
    const tier = context.customerTier;
    if (!tier) return false;
    return TIER_PCT[tier] > 0;
  }

  apply(
    _breakdown: PriceBreakdown,
    context: PricingContext,
  ): ReadonlyArray<PricingModifier> {
    const tier = context.customerTier;
    if (!tier) return [];
    const pct = TIER_PCT[tier];
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
