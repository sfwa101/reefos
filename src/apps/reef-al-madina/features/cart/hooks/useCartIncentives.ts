/**
 * useCartIncentives — Phase 10.1 (Live milestones from Supabase)
 * ----------------------------------------------------------------
 * Reads incentive milestones from the synchronous `liveRules` cache,
 * which is hydrated by `useLiveRules()` mounted at the app root via
 * TanStack Query (`incentive_milestones` table).
 *
 * Affordability gates remain code-side because they involve per-cart
 * profit calculations the engine derives, not admin-tunable values.
 * Each known milestone `key` is mapped to its affordability predicate
 * + icon below; unknown keys gracefully render without an icon and
 * skip the affordability gate.
 *
 * Until the cache hydrates (or on DB failure), `liveRules` returns
 * the same hard-coded fallback ladder we shipped in Phase 9.1, so
 * the UI behaviour is identical.
 */

import { useMemo } from "react";
import {
  Truck,
  ChefHat,
  Percent,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import {
  useCartProfit,
  type CartProfitSummary,
} from "@/core/orders/runtime/react/CartProvider";
import { liveRules } from "@/core/commerce/pricing/config/liveRulesCache";

export type MilestoneKey = string;

export interface CartMilestone {
  readonly key: MilestoneKey;
  readonly threshold: number;
  readonly title: string;
  readonly reward: string;
  readonly icon: LucideIcon;
  readonly thresholdMet: boolean;
  readonly affordable: boolean;
  readonly unlocked: boolean;
  readonly affordabilityHint?: string;
  readonly progress: number;
}

export interface CartIncentivesSummary {
  readonly milestones: ReadonlyArray<CartMilestone>;
  readonly nextIndex: number;
  readonly remainingToNext: number;
}

/* ----------------------------------------------------------------
 * Affordability registry — keyed by milestone `key`.
 * ---------------------------------------------------------------- */

const KITCHEN_GIFT_COST = 60;
const MARGIN_RATIO = 0.05;

type AffordabilityFn = (
  profit: CartProfitSummary,
) => { ok: true } | { ok: false; hint: string };

const AFFORDABILITY: Readonly<Record<string, AffordabilityFn>> = {
  "free-delivery": (p) => {
    const required = 25 * (1 + MARGIN_RATIO);
    return p.totalNetProfit >= required
      ? { ok: true }
      : {
          ok: false,
          hint: "أضف منتجات بهامش ربح أعلى لفتح التوصيل المجاني ✨",
        };
  },
  "kitchen-gift": (p) => {
    const required = KITCHEN_GIFT_COST * (1 + MARGIN_RATIO);
    if (p.totalNetProfit < required || !p.hasKitchenItem) {
      return {
        ok: false,
        hint: "أضف منتجات من قسم المطبخ لفتح هديتك المجانية ✨",
      };
    }
    return { ok: true };
  },
  "extra-discount": (p) => {
    const safe = p.totalCostPrice * 0.15;
    return p.totalNetProfit >= safe
      ? { ok: true }
      : {
          ok: false,
          hint: "السلة قريبة من حدّ الربح — أضف منتجات بهامش أعلى ✨",
        };
  },
};

const ICONS: Readonly<Record<string, LucideIcon>> = {
  Truck,
  ChefHat,
  Percent,
  Sparkles,
};

function resolveIcon(name: string): LucideIcon {
  return ICONS[name] ?? Sparkles;
}

export function useCartIncentives(subtotal: number): CartIncentivesSummary {
  const profit = useCartProfit();
  const ladder = liveRules.getMilestones();

  return useMemo<CartIncentivesSummary>(() => {
    let nextIndex = -1;
    const milestones: CartMilestone[] = ladder.map((m, i) => {
      const prev = i === 0 ? 0 : ladder[i - 1].threshold;
      const thresholdMet = subtotal >= m.threshold;
      const span = Math.max(1, m.threshold - prev);
      const within = Math.max(0, subtotal - prev);
      const progress = thresholdMet ? 1 : Math.min(1, within / span);

      let affordable = true;
      let affordabilityHint: string | undefined;
      const check = AFFORDABILITY[m.key];
      if (check) {
        const verdict = check(profit);
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
        icon: resolveIcon(m.icon),
        thresholdMet,
        affordable,
        unlocked,
        affordabilityHint,
        progress,
      };
    });

    const remainingToNext =
      nextIndex === -1 ? 0 : Math.max(0, ladder[nextIndex].threshold - subtotal);
    return { milestones, nextIndex, remainingToNext };
  }, [subtotal, profit, ladder]);
}
