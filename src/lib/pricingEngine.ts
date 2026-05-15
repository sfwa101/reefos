/**
 * Universal Commerce Engine — Pricing
 * ----------------------------------------------------------------
 * "Stem-cell" pricing layer. Every product (meat, sweets, library,
 * pharmacy, sweets+meat combos, …) flows through the same pipeline.
 *
 * The engine is intentionally domain-agnostic: it accepts a base
 * unit price and an ordered list of `Modifier` objects describing
 * any commerce mutation (variant delta, addon, prep cost, deposit,
 * cross-sell, discount, fee). It produces a single canonical
 * `PriceBreakdown` consumed by the cart, checkout, and receipts.
 *
 * Domain modules (butcheryPrep, sweetsFulfillment, library) are
 * being progressively re-aligned to *emit* Modifier[] arrays
 * instead of computing totals locally. This file is the SINGLE
 * source of truth for arithmetic.
 *
 * NOTHING in this file imports from a domain module. It is a pure
 * leaf utility — fully tree-shakeable and trivially testable.
 */

/* ===================================================================
 * Modifier kinds
 * =================================================================== */

export type ModifierKind =
  /** Multiply base price (e.g. weight factor, bulk pack count). */
  | "weight_factor"
  /** Add absolute amount per unit (e.g. variant size delta, prep cost). */
  | "unit_delta"
  /** Add an absolute addon to the *line* (e.g. cake message, packaging). */
  | "line_addon"
  /** Refundable deposit collected upfront (e.g. library book, large cake). */
  | "deposit"
  /** Cross-sell — sits next to the line, NOT included in unit price. */
  | "cross_sell"
  /** Subtractive — coupon, percentage discount, loyalty redemption. */
  | "discount"
  /** Mandatory fee (e.g. delivery surcharge for cold chain). */
  | "fee";

export type Modifier = {
  /** Stable id for cart receipts and analytics. */
  id: string;
  /** Human-readable label rendered on the cart line and receipt. */
  label: string;
  kind: ModifierKind;
  /**
   * For weight_factor → multiplier (1, 0.5, 2…).
   * For discount with `percent: true` → 0..1.
   * For everything else → absolute amount in EGP.
   */
  amount: number;
  /** When true, `amount` is interpreted as a percentage (0..1). */
  percent?: boolean;
  /** Free-form metadata for downstream consumers (analytics, etc.). */
  meta?: Record<string, unknown>;
};

/* ===================================================================
 * Output shape
 * =================================================================== */

export type PriceBreakdown = {
  /** Per-unit price after weight_factor + unit_delta + per-unit discounts. */
  unitPrice: number;
  /** unitPrice * qty + line_addon - line_discount. */
  lineTotal: number;
  /** Whether ANY deposit modifier is present. */
  depositRequired: boolean;
  /** Sum of refundable deposits (collected upfront, refunded on return). */
  depositAmount: number;
  /** Sum of cross_sell modifiers (sit beside the line, optional add-ons). */
  crossSellTotal: number;
  /** Sum of fee modifiers added to the line. */
  feeTotal: number;
  /** Sum of all discount modifiers applied. */
  discountTotal: number;
  /**
   * Final amount the customer actually pays for this line right now:
   *   lineTotal + depositAmount + crossSellTotal + feeTotal
   * (discountTotal is already subtracted inside lineTotal).
   */
  grandTotal: number;
  /** Echo of the input for receipts / debugging / audit logs. */
  appliedModifiers: Modifier[];
};

/* ===================================================================
 * Calculation
 * =================================================================== */

const round = (n: number) => Math.round(n * 100) / 100;

/**
 * Universal pricing pipeline.
 *
 * @param basePrice  product base unit price (before any modifier)
 * @param modifiers  ordered list of modifiers to apply
 * @param qty        line quantity (defaults to 1)
 *
 * Order of operations (deterministic):
 *   1. Apply weight_factor multipliers to basePrice → unitPrice.
 *   2. Apply unit_delta to unitPrice (per-unit prep, variant delta).
 *   3. Apply per-unit discounts (percent or absolute) to unitPrice.
 *   4. lineTotal = unitPrice * qty.
 *   5. Add line_addon and fee, subtract line-level discounts.
 *   6. Aggregate deposit + cross_sell separately.
 */
export function calculateUniversalPrice(
  basePrice: number,
  modifiers: Modifier[] = [],
  qty: number = 1,
): PriceBreakdown {
  let unitPrice = basePrice;
  let lineAddons = 0;
  let depositAmount = 0;
  let crossSellTotal = 0;
  let feeTotal = 0;
  let discountTotal = 0;
  let depositRequired = false;

  // 1. weight_factor (multiplicative on unit)
  for (const m of modifiers) {
    if (m.kind === "weight_factor") unitPrice *= m.amount;
  }
  // 2. unit_delta (additive on unit)
  for (const m of modifiers) {
    if (m.kind === "unit_delta") unitPrice += m.amount;
  }
  // 3. discount (per-unit if `meta.scope === "unit"`, else line-level)
  for (const m of modifiers) {
    if (m.kind !== "discount") continue;
    const isUnitScope = m.meta?.scope === "unit";
    const value = m.percent ? unitPrice * m.amount : m.amount;
    if (isUnitScope) {
      unitPrice = Math.max(0, unitPrice - value);
      discountTotal += value * qty;
    }
  }

  unitPrice = round(unitPrice);
  let lineTotal = unitPrice * qty;

  // 4. line-level modifiers
  for (const m of modifiers) {
    switch (m.kind) {
      case "line_addon":
        lineAddons += m.amount;
        break;
      case "fee":
        feeTotal += m.amount;
        break;
      case "deposit":
        depositRequired = true;
        depositAmount += m.amount;
        break;
      case "cross_sell":
        crossSellTotal += m.amount;
        break;
      case "discount": {
        if (m.meta?.scope === "unit") break; // already applied above
        const value = m.percent ? lineTotal * m.amount : m.amount;
        lineTotal = Math.max(0, lineTotal - value);
        discountTotal += value;
        break;
      }
    }
  }

  lineTotal = round(lineTotal + lineAddons);
  depositAmount = round(depositAmount);
  crossSellTotal = round(crossSellTotal);
  feeTotal = round(feeTotal);
  discountTotal = round(discountTotal);

  const grandTotal = round(lineTotal + depositAmount + crossSellTotal + feeTotal);

  return {
    unitPrice,
    lineTotal,
    depositRequired,
    depositAmount,
    crossSellTotal,
    feeTotal,
    discountTotal,
    grandTotal,
    appliedModifiers: modifiers,
  };
}

/* ===================================================================
 * Modifier factories — convenience helpers for domain adapters.
 * Domain code should prefer these over building Modifier objects
 * by hand, so that schema changes here propagate everywhere.
 * =================================================================== */

export const mod = {
  weight: (id: string, label: string, factor: number): Modifier => ({
    id,
    label,
    kind: "weight_factor",
    amount: factor,
  }),
  prep: (id: string, label: string, price: number): Modifier => ({
    id,
    label,
    kind: "unit_delta",
    amount: price,
  }),
  variant: (id: string, label: string, delta: number): Modifier => ({
    id,
    label,
    kind: "unit_delta",
    amount: delta,
    meta: { source: "variant" },
  }),
  addon: (id: string, label: string, price: number): Modifier => ({
    id,
    label,
    kind: "line_addon",
    amount: price,
  }),
  deposit: (id: string, label: string, amount: number, meta?: Record<string, unknown>): Modifier => ({
    id,
    label,
    kind: "deposit",
    amount,
    meta,
  }),
  crossSell: (id: string, label: string, price: number): Modifier => ({
    id,
    label,
    kind: "cross_sell",
    amount: price,
  }),
  discount: (id: string, label: string, value: number, opts?: { percent?: boolean; scope?: "unit" | "line" }): Modifier => ({
    id,
    label,
    kind: "discount",
    amount: value,
    percent: opts?.percent,
    meta: { scope: opts?.scope ?? "line" },
  }),
  fee: (id: string, label: string, price: number): Modifier => ({
    id,
    label,
    kind: "fee",
    amount: price,
  }),
};

/* ===================================================================
 * Universal cart-line meta (Generic Stem-Cell shape).
 * CartLineMeta in CartRuntime stays backwards-compatible; this is the
 * forward-looking shape that every section will migrate to.
 * =================================================================== */

export type UniversalLineMeta = {
  /** Generic free-form properties (kind, variantId, bookingDate, …). */
  properties?: Record<string, unknown>;
  /** Modifiers to re-run through the engine when the cart re-prices. */
  appliedModifiers?: Modifier[];
  /** Cached unit price for fast cart rendering (always re-derivable). */
  unitPrice?: number;
};
