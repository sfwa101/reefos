/**
 * Phase 10.1 — Live Rules Cache
 * ----------------------------------------------------------------
 * Synchronous, module-level cache that powers pricing/reward rules
 * with values fetched from the admin-managed Supabase tables
 * (`loyalty_tier_rules`, `incentive_milestones`).
 *
 * Why a sync cache?
 * - Pricing rules (`isApplicable`, `apply`) MUST be synchronous — they
 *   run inside `pricingEngine.calculate()` on every cart re-render.
 * - We hydrate the cache once at app boot via `useLiveRules()` (and
 *   refresh on Supabase realtime / TanStack Query invalidations).
 * - Until hydration completes, rules read the safe defaults below so
 *   the storefront NEVER stalls.
 */

import type { CustomerTierKey } from "../types";

/* ====================== Defaults (Fallback) ====================== */

/** Mirrors the legacy hard-coded ladder — used until DB hydrates. */
export const FALLBACK_TIER_DISCOUNT: Readonly<Record<CustomerTierKey, number>> =
  {
    guest: 0,
    bronze: 0,
    silver: 0.02,
    gold: 0.04,
    platinum: 0.06,
    vip: 0.1,
  };

export const FALLBACK_TIER_MULTIPLIER: Readonly<
  Record<CustomerTierKey, number>
> = {
  guest: 0,
  bronze: 1,
  silver: 1.25,
  gold: 1.5,
  platinum: 2,
  vip: 3,
};

export interface IncentiveMilestoneDTO {
  readonly key: string;
  readonly threshold: number;
  readonly title: string;
  readonly reward: string;
  readonly icon: string;
  readonly sortOrder: number;
}

/** Mirrors the original LADDER from `useCartIncentives.ts`. */
export const FALLBACK_MILESTONES: ReadonlyArray<IncentiveMilestoneDTO> = [
  {
    key: "free-delivery",
    threshold: 500,
    title: "توصيل مجاني",
    reward: "وفّر رسوم التوصيل",
    icon: "Truck",
    sortOrder: 1,
  },
  {
    key: "kitchen-gift",
    threshold: 1500,
    title: "وجبة هدية",
    reward: "من مطبخنا الفاخر 🍽️",
    icon: "ChefHat",
    sortOrder: 2,
  },
  {
    key: "extra-discount",
    threshold: 3000,
    title: "خصم إضافي ٥٪",
    reward: "على كامل السلة",
    icon: "Percent",
    sortOrder: 3,
  },
];

/* ====================== Mutable Cache State ====================== */

let tierDiscount: Record<CustomerTierKey, number> = { ...FALLBACK_TIER_DISCOUNT };
let tierMultiplier: Record<CustomerTierKey, number> = {
  ...FALLBACK_TIER_MULTIPLIER,
};
let milestones: ReadonlyArray<IncentiveMilestoneDTO> = FALLBACK_MILESTONES;
let hydrated = false;

const VALID_TIERS: ReadonlyArray<CustomerTierKey> = [
  "guest",
  "bronze",
  "silver",
  "gold",
  "platinum",
  "vip",
];

function isValidTier(s: string): s is CustomerTierKey {
  return (VALID_TIERS as ReadonlyArray<string>).includes(s);
}

/* ====================== Public API ====================== */

export const liveRules = {
  getTierDiscount(tier: CustomerTierKey): number {
    return tierDiscount[tier] ?? 0;
  },
  getTierMultiplier(tier: CustomerTierKey): number {
    return tierMultiplier[tier] ?? 0;
  },
  getMilestones(): ReadonlyArray<IncentiveMilestoneDTO> {
    return milestones;
  },
  isHydrated(): boolean {
    return hydrated;
  },
} as const;

export interface TierRuleDTO {
  readonly tier: string;
  readonly discount_pct: number;
  readonly points_multiplier: number;
  readonly is_active: boolean;
}

export function hydrateTierRules(rows: ReadonlyArray<TierRuleDTO>): void {
  const nextDiscount: Record<CustomerTierKey, number> = {
    ...FALLBACK_TIER_DISCOUNT,
  };
  const nextMultiplier: Record<CustomerTierKey, number> = {
    ...FALLBACK_TIER_MULTIPLIER,
  };
  for (const r of rows) {
    if (!r.is_active) continue;
    if (!isValidTier(r.tier)) continue;
    if (Number.isFinite(r.discount_pct)) {
      nextDiscount[r.tier] = Math.max(0, Math.min(0.5, r.discount_pct));
    }
    if (Number.isFinite(r.points_multiplier)) {
      nextMultiplier[r.tier] = Math.max(0, Math.min(10, r.points_multiplier));
    }
  }
  tierDiscount = nextDiscount;
  tierMultiplier = nextMultiplier;
  hydrated = true;
}

export interface RawMilestoneDTO {
  readonly key: string;
  readonly threshold: number;
  readonly title: string;
  readonly reward: string;
  readonly icon: string;
  readonly sort_order: number;
  readonly is_active: boolean;
}

export function hydrateMilestones(rows: ReadonlyArray<RawMilestoneDTO>): void {
  const active = rows
    .filter((r) => r.is_active && Number.isFinite(r.threshold) && r.threshold > 0)
    .map<IncentiveMilestoneDTO>((r) => ({
      key: r.key,
      threshold: r.threshold,
      title: r.title,
      reward: r.reward,
      icon: r.icon,
      sortOrder: r.sort_order,
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder);
  milestones = active.length > 0 ? active : FALLBACK_MILESTONES;
  hydrated = true;
}
