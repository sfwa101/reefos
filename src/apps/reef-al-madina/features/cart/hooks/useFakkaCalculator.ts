import { useMemo } from "react";

/**
 * Smart Fakka (Change-Up) Engine — Phase 12.8.
 *
 * Pure mathematical engine: given a "running total" produces 3-4 small,
 * meaningful add-on amounts that complete the total to the next round
 * milestone (5/10/50/100). Replaces the legacy hardcoded percentage tiers.
 *
 * Interlocking design:
 *   The caller passes `runningTotal = subtotal + alreadyPickedExtras`.
 *   That way a tip of 3 EGP shifts the charity rail's options to keep the
 *   chain "rounded" instead of suggesting overlapping numbers.
 */

export type FakkaOption = {
  /** Amount in EGP to add (always positive) */
  amount: number;
  /** Resulting running total after picking this option */
  resulting: number;
  /** Short Arabic label e.g. "3 ج · ⇢ 190" */
  label: string;
  /** The milestone it rounds up to (10/50/100…) — used for sorting/labels */
  step: number;
};

export type FakkaRail = {
  /** "بدون" option — explicit zero so UI can render it as the first chip */
  zero: FakkaOption;
  /** 2-3 smart suggestions, sorted by amount asc */
  suggestions: FakkaOption[];
};

const STEPS = [10, 50, 100] as const;

const fmt = (n: number) => Intl.NumberFormat("en-US").format(n);

const ceilTo = (value: number, step: number): number => {
  if (value <= 0) return step;
  const r = value % step;
  return r === 0 ? value + step : value + (step - r);
};

/**
 * Pure calculator (testable, no React). Produces unique non-zero options
 * sorted ascending. Filters duplicates (e.g. when 187 → 190 and 187 → 200
 * happen to overlap on small carts).
 */
export function calcFakkaSuggestions(runningTotal: number): FakkaOption[] {
  if (!Number.isFinite(runningTotal) || runningTotal < 0) return [];
  const seen = new Set<number>();
  const out: FakkaOption[] = [];
  for (const step of STEPS) {
    const target = ceilTo(runningTotal, step);
    const amount = target - runningTotal;
    if (amount <= 0) continue;
    if (seen.has(amount)) continue;
    seen.add(amount);
    out.push({
      amount,
      resulting: target,
      step,
      label: `${fmt(amount)} ج`,
    });
  }
  return out.sort((a, b) => a.amount - b.amount).slice(0, 3);
}

/**
 * Hook wrapper. `runningTotal` should already include any previously picked
 * fakka contribution from upstream rails (interlocking).
 */
export function useFakkaCalculator(runningTotal: number): FakkaRail {
  return useMemo(() => {
    return {
      zero: { amount: 0, resulting: runningTotal, step: 0, label: "بدون" },
      suggestions: calcFakkaSuggestions(runningTotal),
    };
  }, [runningTotal]);
}
