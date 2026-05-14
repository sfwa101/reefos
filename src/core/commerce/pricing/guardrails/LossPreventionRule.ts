/**
 * LossPreventionRule — Phase 9.1 (Profit Shield)
 * ----------------------------------------------------------------
 * Final guardrail invoked by the engine AFTER every discount and
 * reward rule has run. Two-tier protection model:
 *
 *   TIER 1 — Soft Cap (Phase 9 behaviour, unchanged):
 *     Make sure (discount value + redemption value of points earned)
 *     never exceeds `MAX_INCENTIVE_SHARE_OF_PROFIT` of the line's
 *     gross profit. If breached, scale `discountTotal` down.
 *
 *   TIER 2 — Hard Lock (Phase 9.1, NEW):
 *     If, even after Tier-1 correction, net profit would drop below
 *     `MIN_NET_PROFIT_RATIO` of the original line total, the rule:
 *       • LOCKS further discounts (`discountLocked = true`) — promo
 *         codes and any future stacked discount rule must respect this.
 *       • Restores discountTotal back to a level that keeps net
 *         profit at or above the floor.
 *       • Stamps `requiresAdminApproval = true` so the cart UI shows
 *         a "بانتظار موافقة الإدارة" badge and the admin panel can
 *         queue the line for review.
 *
 * SAFETY VALVE — `context.adminOverride === true` skips the rule
 * entirely. The engine itself never sets that flag; only an
 * authenticated admin code-path may pass it through, and every
 * override MUST be persisted to `admin_override_logs` (RLS-enforced).
 *
 * This rule never mutates `appliedModifiers` (audit integrity is
 * preserved); the correction is recorded as a synthetic
 * `discountTotal` adjustment in the resulting breakdown.
 */

import type { PriceBreakdown, PricingContext } from "../types";
import {
  MAX_INCENTIVE_SHARE_OF_PROFIT,
  MIN_NET_PROFIT_RATIO,
  POINT_REDEMPTION_VALUE,
} from "../types";

const round = (n: number): number => Math.round(n * 100) / 100;

export class LossPreventionRule {
  readonly key = "loss-prevention";

  evaluate(
    breakdown: PriceBreakdown,
    context: PricingContext,
    originalLineTotal: number,
  ): PriceBreakdown {
    // 1. Admin bypass — explicit, audited.
    if (context.adminOverride === true) return breakdown;

    // 2. No cost data path → nothing to protect against.
    if (breakdown.costPrice <= 0) return breakdown;

    const grossProfit = round(originalLineTotal - breakdown.costPrice);

    // 3. Selling at/below cost — already a loss before any discount.
    if (grossProfit <= 0) {
      return {
        ...breakdown,
        isLossPreventionTriggered: true,
        requiresAdminApproval: true,
        discountLocked: true,
        lossPreventionReason: "البيع بسعر أقل من التكلفة الأساسية",
      };
    }

    // 4. TIER 1 — soft incentive cap.
    let working = breakdown;
    const pointsValue = working.pointsEarned * POINT_REDEMPTION_VALUE;
    const totalIncentive = working.discountTotal + pointsValue;
    const ceiling = grossProfit * MAX_INCENTIVE_SHARE_OF_PROFIT;

    if (totalIncentive > ceiling) {
      const allowedDiscount = Math.max(0, ceiling - pointsValue);
      const newDiscountTotal = round(allowedDiscount);
      const correction = round(working.discountTotal - newDiscountTotal);
      const newGrandTotal = round(working.grandTotal + correction);
      working = {
        ...working,
        discountTotal: newDiscountTotal,
        grandTotal: newGrandTotal,
        netProfit: round(newGrandTotal - working.costPrice),
        isLossPreventionTriggered: true,
        lossPreventionReason: `تم تقليص الخصم بمقدار ${correction.toFixed(2)} ج.م لحماية هامش الربح`,
      };
    }

    // 5. TIER 2 — hard profit floor (Phase 9.1).
    //    Even after Tier 1, net profit might still be too thin (e.g. low-margin
    //    SKU + heavy points value). In that case lock further discounts AND
    //    pull discountTotal back to keep profit above the floor.
    const minProfit = round(originalLineTotal * MIN_NET_PROFIT_RATIO);
    if (working.netProfit < minProfit) {
      // Required grandTotal so that grandTotal − costPrice >= minProfit.
      const minGrandTotal = round(working.costPrice + minProfit);
      // We can only fix the situation by giving discount back.
      const newGrandTotal = Math.max(working.grandTotal, minGrandTotal);
      const correction = round(newGrandTotal - working.grandTotal);
      const newDiscountTotal = round(
        Math.max(0, working.discountTotal - correction),
      );
      const newNetProfit = round(newGrandTotal - working.costPrice);

      working = {
        ...working,
        discountTotal: newDiscountTotal,
        grandTotal: newGrandTotal,
        netProfit: newNetProfit,
        isLossPreventionTriggered: true,
        requiresAdminApproval: true,
        discountLocked: true,
        lossPreventionReason: `صافي الربح أقل من ${Math.round(MIN_NET_PROFIT_RATIO * 100)}% — تم تجميد الخصومات الإضافية وتمييز السطر للموافقة الإدارية`,
      };
    }

    return working;
  }
}
