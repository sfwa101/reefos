import { useMemo } from "react";

export type TipPreset = {
  /** Discrete amount in EGP */
  amount: number;
  /** Display label e.g. "5%" or "بدون" */
  label: string;
};

/**
 * Dynamic tip presets — replaces the legacy hardcoded [0, 5, 10, 20].
 *
 * Strategy: 0 + percentage tiers (5% / 10% / 15%) of the cart subtotal,
 * snapped to the nearest 5 EGP and floored at 5 EGP per tier so we never
 * suggest a 1-EGP tip on a tiny basket. For empty carts we fall back to a
 * sensible static ladder so the UI never shows weird values.
 */
export function useTipPresets(subtotal: number): TipPreset[] {
  return useMemo(() => {
    if (subtotal <= 0) {
      return [
        { amount: 0, label: "بدون" },
        { amount: 5, label: "5 ج" },
        { amount: 10, label: "10 ج" },
        { amount: 20, label: "20 ج" },
      ];
    }
    const snap = (n: number): number => Math.max(5, Math.round(n / 5) * 5);
    const t5 = snap(subtotal * 0.05);
    const t10 = snap(subtotal * 0.10);
    const t15 = snap(subtotal * 0.15);
    return [
      { amount: 0, label: "بدون" },
      { amount: t5, label: `${t5} ج · 5%` },
      { amount: t10, label: `${t10} ج · 10%` },
      { amount: t15, label: `${t15} ج · 15%` },
    ];
  }, [subtotal]);
}
