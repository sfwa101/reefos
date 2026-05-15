/**
 * Salsabil OS — Wave P-1.3 · Sovereign Line-Total Resolver.
 *
 * Layer 4 (Domain). Single canonical entry point for "what does ONE cart line
 * cost?". The Sovereign Pricing Engine (`evaluateCartLineItem`) runs first;
 * for products with no registered strategy the engine layer synthesises a
 * trivial breakdown here — NEVER inside a React component.
 *
 * Hard rule (Law 3 — Presentation Purity): UI MAY ONLY consume the
 * `PriceBreakdown` returned from this module. UI MUST NOT multiply, sum, or
 * subtract prices. All financial arithmetic is sealed inside this module
 * and the engines it delegates to.
 */
import {
  evaluateCartLineItem,
  type CartPricingResult,
} from "@/core/commerce/pricing/cartPricingAdapter";
import type {
  PriceBreakdown,
  PricingContext,
} from "@/core/commerce/pricing/types";
import type { CartLine } from "@/core/orders/runtime/types";

export type CanonicalLineKind = "engine" | "synth" | "engine_error";

export interface CanonicalLineBreakdown {
  readonly kind: CanonicalLineKind;
  readonly breakdown: PriceBreakdown;
  readonly engineResult: CartPricingResult | null;
}

const round2 = (n: number): number => Math.round(n * 100) / 100;

/**
 * Engine-layer trivial-buy synthesiser. Used when no `PricingStrategy` is
 * registered for a product (typical simple supermarket lines). Lives HERE —
 * not in any React component — to keep the UI a dumb renderer.
 */
function synthesiseTrivialBreakdown(
  unitPrice: number,
  qty: number,
): PriceBreakdown {
  const safeUnit = Number.isFinite(unitPrice) ? Math.max(0, unitPrice) : 0;
  const safeQty = Number.isFinite(qty) ? Math.max(0, Math.floor(qty)) : 0;
  const lineTotal = round2(safeUnit * safeQty);
  return {
    unitPrice: round2(safeUnit),
    lineTotal,
    depositRequired: false,
    depositAmount: 0,
    crossSellTotal: 0,
    feeTotal: 0,
    discountTotal: 0,
    grandTotal: lineTotal,
    pointsEarned: 0,
    costPrice: round2(lineTotal * 0.8),
    netProfit: round2(lineTotal * 0.2),
    isLossPreventionTriggered: false,
    requiresAdminApproval: false,
    discountLocked: false,
    appliedModifiers: [],
    strategyKey: "trivial-buy",
  };
}

export type CustomerTierLite = NonNullable<PricingContext["customerTier"]>;

/**
 * Canonical per-line resolver. Always returns a `PriceBreakdown`. UI MUST
 * use this (or a hook that wraps it) instead of inlining `price * qty`.
 */
export function evaluateCartLineCanonical(
  line: CartLine,
  tier: CustomerTierLite = "guest",
): CanonicalLineBreakdown {
  const props = line.meta?.properties as { selection?: unknown } | undefined;
  const hasNewShape =
    (line.meta?.appliedModifiers && line.meta.appliedModifiers.length > 0) ||
    props?.selection !== undefined;

  if (hasNewShape) {
    const result = evaluateCartLineItem({
      product: line.product,
      quantity: line.qty,
      selection: ((props?.selection ?? props) ?? {}) as never,
      context: { customerTier: tier },
    });
    if (result.kind === "ok") {
      return { kind: "engine", breakdown: result.breakdown, engineResult: result };
    }
    if (result.kind === "engine_error") {
      // Surface error with a synthesised breakdown so the cart still adds up.
      return {
        kind: "engine_error",
        breakdown: synthesiseTrivialBreakdown(
          line.meta?.unitPrice ?? line.product.price,
          line.qty,
        ),
        engineResult: result,
      };
    }
  }

  return {
    kind: "synth",
    breakdown: synthesiseTrivialBreakdown(
      line.meta?.unitPrice ?? line.product.price,
      line.qty,
    ),
    engineResult: null,
  };
}

/** Sum the canonical grand totals across an array of cart lines. */
export function sumCanonicalGrandTotals(
  lines: ReadonlyArray<CartLine>,
  tier: CustomerTierLite = "guest",
): number {
  let total = 0;
  for (const l of lines) total += evaluateCartLineCanonical(l, tier).breakdown.grandTotal;
  return round2(total);
}

/** Sum the canonical pre-discount line totals (subtotal). */
export function sumCanonicalSubtotals(
  lines: ReadonlyArray<CartLine>,
  tier: CustomerTierLite = "guest",
): number {
  let total = 0;
  for (const l of lines) total += evaluateCartLineCanonical(l, tier).breakdown.lineTotal;
  return round2(total);
}

/**
 * Wave P-1.3.B — Tier-aware non-hook accessor.
 *
 * Returns the canonical grand total for ONE cart line. Identical math to
 * `useCartLineTotals` (which delegates here). Safe to call outside React —
 * orchestrators, WhatsApp builders, vendor groupers, predictive baskets and
 * any background utility MUST use this instead of `product.price * qty`.
 */
export function lineGrandTotal(
  line: CartLine,
  tier: CustomerTierLite = "guest",
): number {
  return evaluateCartLineCanonical(line, tier).breakdown.grandTotal;
}

/**
 * Wave P-1.3.B — Predicate-filtered canonical sum. Use when an orchestrator
 * needs to sum only a subset of lines (e.g. wakalah-only, vendor-scoped)
 * without re-implementing `price * qty`.
 */
export function sumCanonicalGrandTotalsWhere(
  lines: ReadonlyArray<CartLine>,
  predicate: (line: CartLine) => boolean,
  tier: CustomerTierLite = "guest",
): number {
  let total = 0;
  for (const l of lines) {
    if (predicate(l)) total += evaluateCartLineCanonical(l, tier).breakdown.grandTotal;
  }
  return round2(total);
}
