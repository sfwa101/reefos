/**
 * BulkQuantityDiscount
 * ----------------------------------------------------------------
 * Generic line-level discount triggered purely by quantity. Independent
 * from `WholesalePricingStrategy` tierBreaks: this rule is the engine's
 * default safety net — applied to ANY product when the customer crosses
 * configurable thresholds.
 *
 * Default ladder (lowest → highest qty wins):
 *   • qty ≥ 6  → 3%
 *   • qty ≥ 12 → 6%
 *   • qty ≥ 24 → 10%
 *
 * Override the ladder via the constructor for B2B / promo windows.
 *
 * NOTE — composition with WholesalePricingStrategy:
 * The strategy emits its own `unit_delta` tier discount which lowers
 * `unitPrice` BEFORE this rule fires. This rule then applies its % on
 * the already-discounted line total. That stacking is intentional and
 * matches the legacy cart behaviour (volume + tier compose).
 */

import type {
  IDiscountRule,
  PriceBreakdown,
  PricingContext,
  PricingModifier,
} from "../types";
import { isExcludedFromDiscounts } from "../utils/exclusions";

export interface BulkTier {
  readonly minQty: number;
  readonly pct: number; // 0..1
}

const DEFAULT_TIERS: ReadonlyArray<BulkTier> = [
  { minQty: 6, pct: 0.03 },
  { minQty: 12, pct: 0.06 },
  { minQty: 24, pct: 0.10 },
];

export class BulkQuantityDiscount implements IDiscountRule {
  readonly key = "bulk-quantity";

  constructor(
    private readonly tiers: ReadonlyArray<BulkTier> = DEFAULT_TIERS,
  ) {}

  /** Quantity is encoded in `lineTotal / unitPrice`; cheap & exact. */
  private resolveQty(breakdown: PriceBreakdown): number {
    if (breakdown.unitPrice <= 0) return 0;
    return Math.round(breakdown.lineTotal / breakdown.unitPrice);
  }

  private bestTier(qty: number): BulkTier | null {
    let winner: BulkTier | null = null;
    for (const t of this.tiers) {
      if (qty < t.minQty) continue;
      if (!winner || t.minQty > winner.minQty) winner = t;
    }
    return winner;
  }

  isApplicable(breakdown: PriceBreakdown, context: PricingContext): boolean {
    if (isExcludedFromDiscounts(context)) return false;
    const qty = this.resolveQty(breakdown);
    return this.bestTier(qty) !== null;
  }

  apply(
    breakdown: PriceBreakdown,
    _context: PricingContext,
  ): ReadonlyArray<PricingModifier> {
    const qty = this.resolveQty(breakdown);
    const tier = this.bestTier(qty);
    if (!tier) return [];

    return [
      {
        id: `bulk:${tier.minQty}`,
        label: `خصم الكمية (${tier.minQty}+ → ${Math.round(tier.pct * 100)}%)`,
        kind: "discount",
        amount: tier.pct,
        percent: true,
        meta: {
          scope: "line",
          source: "bulk-quantity",
          tierMinQty: tier.minQty,
          observedQty: qty,
        },
      },
    ];
  }
}
