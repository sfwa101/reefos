/**
 * useCartIncentives — Phase 9 (Smart Incentive Milestones)
 * ----------------------------------------------------------------
 * Pure derivation hook over the live cart subtotal. Returns a typed
 * ladder of progress milestones the UI renders as a multi-step bar.
 *
 * Milestones are declarative, externally inspectable, and trivially
 * extendable from a future `marketing_milestones` table without
 * touching the consumer component.
 *
 * No monetary math leaks here — every threshold is just a target
 * value vs `subtotal`. The Cart's pricing engine remains the sole
 * source of truth for prices, discounts, and points.
 */

import { useMemo } from "react";
import { Truck, ChefHat, Percent, type LucideIcon } from "lucide-react";

export type MilestoneKey = "free-delivery" | "kitchen-gift" | "extra-discount";

export interface CartMilestone {
  readonly key: MilestoneKey;
  readonly threshold: number;
  readonly title: string;
  readonly reward: string;
  readonly icon: LucideIcon;
  readonly unlocked: boolean;
  /** 0..1 — share of distance from the previous milestone reached. */
  readonly progress: number;
}

export interface CartIncentivesSummary {
  readonly milestones: ReadonlyArray<CartMilestone>;
  /** Index of the next locked milestone, or -1 if all unlocked. */
  readonly nextIndex: number;
  /** EGP remaining to next milestone (0 when fully unlocked). */
  readonly remainingToNext: number;
}

const LADDER: ReadonlyArray<{
  key: MilestoneKey;
  threshold: number;
  title: string;
  reward: string;
  icon: LucideIcon;
}> = [
  {
    key: "free-delivery",
    threshold: 500,
    title: "توصيل مجاني",
    reward: "وفّر رسوم التوصيل",
    icon: Truck,
  },
  {
    key: "kitchen-gift",
    threshold: 1500,
    title: "وجبة هدية",
    reward: "من مطبخنا الفاخر 🍽️",
    icon: ChefHat,
  },
  {
    key: "extra-discount",
    threshold: 3000,
    title: "خصم إضافي ٥٪",
    reward: "على كامل السلة",
    icon: Percent,
  },
];

export function useCartIncentives(subtotal: number): CartIncentivesSummary {
  return useMemo<CartIncentivesSummary>(() => {
    let nextIndex = -1;
    const milestones: CartMilestone[] = LADDER.map((m, i) => {
      const prev = i === 0 ? 0 : LADDER[i - 1].threshold;
      const unlocked = subtotal >= m.threshold;
      const span = m.threshold - prev;
      const within = Math.max(0, subtotal - prev);
      const progress = unlocked ? 1 : Math.min(1, within / span);
      if (!unlocked && nextIndex === -1) nextIndex = i;
      return { ...m, unlocked, progress };
    });
    const remainingToNext =
      nextIndex === -1 ? 0 : LADDER[nextIndex].threshold - subtotal;
    return { milestones, nextIndex, remainingToNext };
  }, [subtotal]);
}
