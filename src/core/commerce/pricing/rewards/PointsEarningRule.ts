/**
 * PointsEarningRule — Phase 8 (Loyalty & Rewards Protocol)
 * ----------------------------------------------------------------
 * Cross-cutting reward rule applied AFTER strategies + discounts.
 * Computes loyalty points for a single cart line as:
 *
 *     pointsEarned = round(grandTotal × POINTS_PER_EGP × tierMultiplier)
 *
 * Tier multipliers mirror `src/lib/tiers.ts` (guest = 0 — anonymous
 * visitors don't accrue). Bronze = 1, Silver = 1.25, Gold = 1.5,
 * Platinum = 2, VIP = 3.
 *
 * SMART EXCLUSION (Metadata-driven):
 *   product.metadata.excludeFromLoyalty === true   → 0 base points.
 *
 * BONUS CHIP (Offer products):
 *   product.metadata.bonusPoints (number > 0)
 *     → emitted as an additive `bonusPoints` flag the UI surfaces as
 *       "+50 نقطة هدية" inside the Cart, regardless of tier.
 *
 * Why a Rule (not a Strategy modifier): rewards are orthogonal to the
 * vertical (meat/sweets/wholesale/…). Adding more programs (referral,
 * weekend ×2, birthday bonus) means writing a new IRewardRule, not
 * touching any pricing path.
 */

import type {
  IRewardRule,
  PriceBreakdown,
  PricingContext,
  RewardOutcome,
} from "../types";
import { liveRules } from "../config/liveRulesCache";

/** Base earning rate: 1 point per 1 EGP of final grand total. */
const POINTS_PER_EGP = 1;

/** Narrow read of a single metadata key without using `any`. */
function readBoolFlag(
  meta: Readonly<Record<string, unknown>> | undefined,
  key: string,
): boolean {
  if (!meta) return false;
  const v = meta[key];
  return v === true;
}

function readNumberFlag(
  meta: Readonly<Record<string, unknown>> | undefined,
  key: string,
): number {
  if (!meta) return 0;
  const v = meta[key];
  return typeof v === "number" && Number.isFinite(v) && v > 0 ? v : 0;
}

export class PointsEarningRule implements IRewardRule {
  readonly key = "points-earning";

  isApplicable(breakdown: PriceBreakdown, context: PricingContext): boolean {
    // Skip for guests — only authenticated customers accrue points.
    const tier = context.customerTier;
    if (!tier || tier === "guest") return false;
    if (breakdown.grandTotal <= 0) return false;
    return true;
  }

  apply(breakdown: PriceBreakdown, context: PricingContext): RewardOutcome {
    const tier = context.customerTier;
    if (!tier) return { points: 0 };

    const meta = context.product.metadata as
      | Readonly<Record<string, unknown>>
      | undefined;

    const excluded = readBoolFlag(meta, "excludeFromLoyalty");
    const bonus = readNumberFlag(meta, "bonusPoints");

    if (excluded) {
      // Excluded from base earning — but a manually-set bonus chip
      // (e.g. promotional gift) still goes through.
      return bonus > 0 ? { points: 0, bonusPoints: bonus } : { points: 0 };
    }

    const multiplier = liveRules.getTierMultiplier(tier);
    const points = breakdown.grandTotal * POINTS_PER_EGP * multiplier;

    return bonus > 0
      ? { points, bonusPoints: bonus }
      : { points };
  }
}
