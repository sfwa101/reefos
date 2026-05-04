/**
 * LossPreventionRule — Phase 9 (Profit Guardrails)
 * ----------------------------------------------------------------
 * Final guardrail invoked by the engine AFTER every discount and
 * reward rule has run. Its job is one thing only:
 *
 *   Make sure (discount value + redemption value of points earned)
 *   never exceeds `MAX_INCENTIVE_SHARE_OF_PROFIT` of the line's
 *   gross profit (`originalLineTotal − costPrice`).
 *
 * If the threshold is breached:
 *   1. Compute the maximum allowed customer-incentive spend.
 *   2. Scale the line's `discountTotal` down to fit under that ceiling.
 *      (Points are NOT clipped — they keep their advertised value but
 *      the discount portion absorbs the correction so the customer's
 *      experience is "smaller % off", not "fewer points".)
 *   3. Recompute `grandTotal`, `netProfit`, and stamp
 *      `isLossPreventionTriggered = true` with a human reason.
 *
 * SAFETY VALVE — `context.adminOverride === true` skips the rule
 * entirely. The engine itself never sets that flag; only an
 * authenticated admin code-path may pass it through.
 *
 * This rule never mutates `appliedModifiers` (audit integrity is
 * preserved); the correction is recorded as a synthetic
 * `discountTotal` adjustment in the resulting breakdown.
 */

import type { PriceBreakdown, PricingContext } from "../types";
import {
  MAX_INCENTIVE_SHARE_OF_PROFIT,
  POINT_REDEMPTION_VALUE,
} from "../types";

const round = (n: number): number => Math.round(n * 100) / 100;

export class LossPreventionRule {
  readonly key = "loss-prevention";

  /**
   * Inspect a finalised breakdown and, if needed, return a corrected
   * one. Always returns a valid breakdown — caller should swap in
   * unconditionally.
   *
   * @param breakdown        the post-discount, post-reward breakdown
   * @param context          full pricing context (reads `adminOverride`)
   * @param originalLineTotal  the line total BEFORE any discount
   *                           (i.e. unitPrice×qty as the strategy
   *                           originally produced) — required to know
   *                           how big the discount actually was.
   */
  evaluate(
    breakdown: PriceBreakdown,
    context: PricingContext,
    originalLineTotal: number,
  ): PriceBreakdown {
    // 1. Admin bypass — explicit, audited.
    if (context.adminOverride === true) return breakdown;

    // 2. No cost data path → nothing to protect against.
    if (breakdown.costPrice <= 0) return breakdown;

    // 3. Gross profit reference (BEFORE customer incentives).
    const grossProfit = round(originalLineTotal - breakdown.costPrice);
    if (grossProfit <= 0) {
      // Already selling at/below cost — flag but cannot recover here
      // without re-pricing. UI surfaces the warning.
      return {
        ...breakdown,
        isLossPreventionTriggered: true,
        lossPreventionReason: "البيع بسعر أقل من التكلفة الأساسية",
      };
    }

    // 4. Total incentive value handed back to the customer.
    const pointsValue = breakdown.pointsEarned * POINT_REDEMPTION_VALUE;
    const totalIncentive = breakdown.discountTotal + pointsValue;

    const ceiling = grossProfit * MAX_INCENTIVE_SHARE_OF_PROFIT;
    if (totalIncentive <= ceiling) return breakdown;

    // 5. Breach — scale the discount down. Points are preserved.
    const allowedDiscount = Math.max(0, ceiling - pointsValue);
    const newDiscountTotal = round(allowedDiscount);
    const correction = round(breakdown.discountTotal - newDiscountTotal);
    const newGrandTotal = round(breakdown.grandTotal + correction);
    const newNetProfit = round(newGrandTotal - breakdown.costPrice);

    return {
      ...breakdown,
      discountTotal: newDiscountTotal,
      grandTotal: newGrandTotal,
      netProfit: newNetProfit,
      isLossPreventionTriggered: true,
      lossPreventionReason: `تم تقليص الخصم بمقدار ${correction.toFixed(2)} ج.م لحماية هامش الربح (الحد الآمن ${Math.round(MAX_INCENTIVE_SHARE_OF_PROFIT * 100)}% من الربح)`,
    };
  }
}
