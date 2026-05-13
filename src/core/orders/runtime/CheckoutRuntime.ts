/**
 * Salsabil OS — Constitution v2.0 · Wave B-3.5
 * Layer 4 (Runtime) · Checkout Pricing Engine — pure stateless logic.
 *
 * Removes the math leak from `CheckoutSheet.tsx`. The UI captures intent
 * (tip, charity, grand total) and delegates ALL arithmetic to this engine.
 *
 * Constitutional guarantees:
 *  - Zero React imports, zero hooks, zero I/O.
 *  - Pure functions: same input ⇒ same output.
 *  - Deterministic rounding (whole EGP for rails).
 */

export interface CheckoutRailInput {
  /** Final grand total computed by the cart orchestrator (incl. tip + charity). */
  effectiveGrand: number;
  /** Smart Fakka — Team Bonus amount currently selected. */
  tip: number;
  /** Smart Fakka — Charity amount currently selected. */
  charity: number;
}

export interface CheckoutRailTotals {
  /** Grand total stripped of optional rails (tip + charity) — whole EGP. */
  baseTotal: number;
  /** Anchor for the Tip rail (computed on the pre-tip total). */
  tipRailTotal: number;
  /** Anchor for the Charity rail (interlocked: starts after tip is picked). */
  charityRailTotal: number;
}

const round = (n: number) => Math.round(n);

/**
 * Compute the interlocked rail totals shown inside CheckoutSheet.
 * The Charity rail builds on the Tip rail, which builds on the base total.
 */
export function computeCheckoutRails(input: CheckoutRailInput): CheckoutRailTotals {
  const baseTotal = round(input.effectiveGrand - input.tip - input.charity);
  const tipRailTotal = baseTotal;
  const charityRailTotal = baseTotal + input.tip;
  return { baseTotal, tipRailTotal, charityRailTotal };
}

/**
 * The amount actually charged to the customer right now — rounded to whole
 * EGP for the sticky CTA pill. Centralised so any future currency / rounding
 * rule (e.g. piastres, bankers' rounding) is applied in ONE place.
 */
export function computeChargeableAmount(effectiveGrand: number): number {
  return round(effectiveGrand);
}
