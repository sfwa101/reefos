/**
 * Salsabil OS — Wave P-1.2 · Sovereign Modifier Surface.
 *
 * Constitutional source of truth for the modifier-based pricing utilities
 * historically housed in `the destroyed legacy pricing module`. Moved verbatim into
 * `core/commerce/pricing/` so Law 9 (Single Source of Truth) is enforced
 * for the entire pricing namespace.
 *
 * Relationship to the orchestrator (`./PricingEngine.ts`):
 *   - The orchestrator owns Strategies + DiscountRules + RewardRules.
 *   - This module owns the low-level pure modifier pipeline used by both
 *     the orchestrator's `foldModifiers` and the legacy cart shadow path.
 *   - `Modifier` is a mutable structural alias of `PricingModifier`. Both
 *     compile to the same shape; one is read-only at the type boundary.
 *
 * NOTHING in this file imports from a domain module. Pure leaf utility.
 */

import type { ModifierKind, PricingModifier } from "./types";

export type { ModifierKind } from "./types";

/**
 * Legacy mutable modifier shape. Structurally identical to
 * `PricingModifier` but without the `readonly` access markers, so it
 * remains assignable to/from the orchestrator's modifier surface.
 */
export type Modifier = {
  id: string;
  label: string;
  kind: ModifierKind;
  amount: number;
  percent?: boolean;
  meta?: Record<string, unknown>;
};

/**
 * Output shape returned by `calculateUniversalPrice`. Distinct from the
 * orchestrator's richer `PriceBreakdown` (which adds profit / loyalty /
 * guardrail fields) — kept separate so legacy shadow consumers don't
 * have to fabricate fields they never used.
 */
export type ModifierBreakdown = {
  unitPrice: number;
  lineTotal: number;
  depositRequired: boolean;
  depositAmount: number;
  crossSellTotal: number;
  feeTotal: number;
  discountTotal: number;
  grandTotal: number;
  appliedModifiers: Modifier[];
};

const round = (n: number) => Math.round(n * 100) / 100;

/**
 * Universal pricing pipeline (mirrors the orchestrator's `foldModifiers`
 * and the prior `the destroyed legacy pricing module` implementation byte-for-byte to
 * preserve shadow-pricing audit equivalence).
 */
export function calculateUniversalPrice(
  basePrice: number,
  modifiers: Modifier[] = [],
  qty: number = 1,
): ModifierBreakdown {
  let unitPrice = basePrice;
  let lineAddons = 0;
  let depositAmount = 0;
  let crossSellTotal = 0;
  let feeTotal = 0;
  let discountTotal = 0;
  let depositRequired = false;

  for (const m of modifiers) {
    if (m.kind === "weight_factor") unitPrice *= m.amount;
  }
  for (const m of modifiers) {
    if (m.kind === "unit_delta") unitPrice += m.amount;
  }
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
        if (m.meta?.scope === "unit") break;
        const value = m.percent ? lineTotal * m.amount : m.amount;
        lineTotal = Math.max(0, lineTotal - value);
        discountTotal += value;
        break;
      }
      case "weight_factor":
      case "unit_delta":
        break;
    }
  }

  lineTotal = round(lineTotal + lineAddons);
  depositAmount = round(depositAmount);
  crossSellTotal = round(crossSellTotal);
  feeTotal = round(feeTotal);
  discountTotal = round(discountTotal);

  const grandTotal = round(
    lineTotal + depositAmount + crossSellTotal + feeTotal,
  );

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
 * Domain code MUST prefer these over hand-built objects so schema
 * drift propagates everywhere automatically.
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
  deposit: (
    id: string,
    label: string,
    amount: number,
    meta?: Record<string, unknown>,
  ): Modifier => ({
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
  discount: (
    id: string,
    label: string,
    value: number,
    opts?: { percent?: boolean; scope?: "unit" | "line" },
  ): Modifier => ({
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

/**
 * Universal cart-line meta (Generic Stem-Cell shape). `CartLineMeta`
 * in `CartRuntime` stays backwards-compatible; this is the
 * forward-looking shape every section migrates to.
 */
export type UniversalLineMeta = {
  properties?: Record<string, unknown>;
  appliedModifiers?: Modifier[];
  unitPrice?: number;
};

/**
 * Compile-time assertion: `Modifier` is structurally assignable to the
 * orchestrator's `PricingModifier`. Catches accidental schema drift.
 */
const _modifierShapeAssertion: PricingModifier = {} as Modifier;
void _modifierShapeAssertion;
