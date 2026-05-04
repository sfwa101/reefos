/**
 * useCartIncentives — Phase 9.1 (Profit-Aware Milestones)
 * ----------------------------------------------------------------
 * Pure derivation hook over the live cart subtotal AND profit profile.
 * Returns a typed ladder of milestones the UI renders as a multi-step
 * progress bar.
 *
 * Phase 9.1 upgrade: each milestone may declare an Affordability Check.
 * If the predicate fails, the milestone stays visually locked and
 * surfaces a helper message — even if the customer crossed its money
 * threshold. This prevents the platform from giving away rewards
 * (e.g. a free kitchen meal) on carts whose net profit can't absorb
 * the gift's cost.
 *
 * No monetary math leaks here — every threshold is just a target
 * value vs `subtotal`, and every affordability check is a pure read
 * of `useCartProfit()` numbers from `pricingEngine`.
 */

import { useMemo } from "react";
import { Truck, ChefHat, Percent, type LucideIcon } from "lucide-react";
import {
  useCartProfit,
  type CartProfitSummary,
} from "@/context/CartContext";

export type MilestoneKey = "free-delivery" | "kitchen-gift" | "extra-discount";

export interface CartMilestone {
  readonly key: MilestoneKey;
  readonly threshold: number;
  readonly title: string;
  readonly reward: string;
  readonly icon: LucideIcon;
  /** Money threshold met. */
  readonly thresholdMet: boolean;
  /** Affordability gate passed (defaults to `true` when no gate). */
  readonly affordable: boolean;
  /** thresholdMet && affordable. The UI uses this for the green check. */
  readonly unlocked: boolean;
  /** Helper text shown when threshold met but not affordable. */
  readonly affordabilityHint?: string;
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

/* ----------------------------------------------------------------
 * Affordability checks
 * ---------------------------------------------------------------- */

/** Estimated cost (EGP) of the bundled "free kitchen meal" gift. */
const KITCHEN_GIFT_COST = 60;
/** Required margin on top of the gift cost so the platform stays profitable. */
const KITCHEN_GIFT_MARGIN_RATIO = 0.05;

interface MilestoneSpec {
  readonly key: MilestoneKey;
  readonly threshold: number;
  readonly title: string;
  readonly reward: string;
  readonly icon: LucideIcon;
  readonly affordability?: (
    profit: CartProfitSummary,
  ) => { ok: true } | { ok: false; hint: string };
}

const LADDER: ReadonlyArray<MilestoneSpec> = [
  {
    key: "free-delivery",
    threshold: 500,
    title: "توصيل مجاني",
    reward: "وفّر رسوم التوصيل",
    icon: Truck,
    // Free delivery becomes affordable when the cart's net profit can
    // absorb the average delivery cost (~25 EGP) with a small margin.
    affordability: (p) => {
      const requiredProfit = 25 * (1 + KITCHEN_GIFT_MARGIN_RATIO);
      if (p.totalNetProfit >= requiredProfit) return { ok: true };
      return {
        ok: false,
        hint: "أضف منتجات بهامش ربح أعلى لفتح التوصيل المجاني ✨",
      };
    },
  },
  {
    key: "kitchen-gift",
    threshold: 1500,
    title: "وجبة هدية",
    reward: "من مطبخنا الفاخر 🍽️",
    icon: ChefHat,
    affordability: (p) => {
      const requiredProfit = KITCHEN_GIFT_COST * (1 + KITCHEN_GIFT_MARGIN_RATIO);
      if (p.totalNetProfit < requiredProfit) {
        return {
          ok: false,
          hint: "أضف منتجات من قسم المطبخ لفتح هديتك المجانية ✨",
        };
      }
      // Even with profit headroom, only redeemable when the cart already
      // contains a kitchen item (so we know what flavour profile to gift).
      if (!p.hasKitchenItem) {
        return {
          ok: false,
          hint: "أضف منتجات من قسم المطبخ لفتح هديتك المجانية ✨",
        };
      }
      return { ok: true };
    },
  },
  {
    key: "extra-discount",
    threshold: 3000,
    title: "خصم إضافي ٥٪",
    reward: "على كامل السلة",
    icon: Percent,
    // Extra 5% discount only ok when current profit is healthy enough.
    affordability: (p) => {
      const safeProfit = p.totalCostPrice * 0.15;
      if (p.totalNetProfit >= safeProfit) return { ok: true };
      return {
        ok: false,
        hint: "السلة قريبة من حدّ الربح — أضف منتجات بهامش أعلى ✨",
      };
    },
  },
];

export function useCartIncentives(subtotal: number): CartIncentivesSummary {
  const profit = useCartProfit();

  return useMemo<CartIncentivesSummary>(() => {
    let nextIndex = -1;
    const milestones: CartMilestone[] = LADDER.map((m, i) => {
      const prev = i === 0 ? 0 : LADDER[i - 1].threshold;
      const thresholdMet = subtotal >= m.threshold;
      const span = m.threshold - prev;
      const within = Math.max(0, subtotal - prev);
      const progress = thresholdMet ? 1 : Math.min(1, within / span);

      let affordable = true;
      let affordabilityHint: string | undefined;
      if (m.affordability) {
        const verdict = m.affordability(profit);
        if (!verdict.ok) {
          affordable = false;
          affordabilityHint = verdict.hint;
        }
      }

      const unlocked = thresholdMet && affordable;
      if (!unlocked && nextIndex === -1) nextIndex = i;

      return {
        key: m.key,
        threshold: m.threshold,
        title: m.title,
        reward: m.reward,
        icon: m.icon,
        thresholdMet,
        affordable,
        unlocked,
        affordabilityHint,
        progress,
      };
    });

    const remainingToNext =
      nextIndex === -1 ? 0 : Math.max(0, LADDER[nextIndex].threshold - subtotal);
    return { milestones, nextIndex, remainingToNext };
  }, [subtotal, profit]);
}
