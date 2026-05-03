/**
 * Core Pricing Engine — Type Contracts
 * ----------------------------------------------------------------
 * Domain-agnostic, strictly-typed contracts for the new ELITE pricing
 * engine. NO `any`, NO `as unknown`. These types are the SINGLE source
 * of truth that every Strategy and Discount Rule must respect.
 *
 * Built in PARALLEL to legacy `src/lib/pricingEngine.ts` — nothing here
 * imports from or mutates the live cart pipeline. Wiring is a later phase.
 */

import type { Product } from "@/lib/products";

/* ===================================================================
 * Modifier kinds (mirrors legacy engine for forward-compat migration).
 * =================================================================== */

export type ModifierKind =
  | "weight_factor"   // multiplicative on unit price
  | "unit_delta"      // additive on unit price
  | "line_addon"      // absolute add to line total
  | "deposit"         // refundable amount collected upfront
  | "cross_sell"      // optional companion item, sits beside the line
  | "discount"        // negative — coupon, %, loyalty
  | "fee";            // mandatory surcharge (cold chain, packaging)

export interface PricingModifier {
  readonly id: string;
  readonly label: string;
  readonly kind: ModifierKind;
  readonly amount: number;
  readonly percent?: boolean;
  readonly meta?: Readonly<Record<string, unknown>>;
}

/* ===================================================================
 * Strategy input / output contracts
 * =================================================================== */

/**
 * Selection payload passed to a strategy. Each strategy declares its
 * own concrete `TSelection` shape (e.g. butchery has weight + prep +
 * addons; wholesale has tier + qty break).
 *
 * The base shape is empty — strategies extend it with `interface` merging
 * or by declaring their own `Selection` type and parameterising
 * `IPricingStrategy<TSelection>`.
 */
export interface PricingSelection {
  readonly quantity: number;
}

export interface PricingContext {
  readonly product: Readonly<Product>;
  readonly currency: "EGP";
  /** Optional zone hint — strategies may apply cold-chain fees, etc. */
  readonly zoneAcceptsPerishables?: boolean;
  /** Optional customer tier — used by discount rules. */
  readonly customerTier?: "guest" | "member" | "vip";
}

export interface PriceBreakdown {
  readonly unitPrice: number;
  readonly lineTotal: number;
  readonly depositRequired: boolean;
  readonly depositAmount: number;
  readonly crossSellTotal: number;
  readonly feeTotal: number;
  readonly discountTotal: number;
  readonly grandTotal: number;
  readonly appliedModifiers: ReadonlyArray<PricingModifier>;
  /** Strategy that produced this breakdown — for receipts & audit. */
  readonly strategyKey: string;
}

/* ===================================================================
 * Strategy & Discount interfaces (Strategy Pattern + DI)
 * =================================================================== */

/**
 * Strategy contract — every domain (meat, sweets, library, wholesale,
 * pharmacy …) implements this. Strategies are PURE: no I/O, no globals.
 */
export interface IPricingStrategy<
  TSelection extends PricingSelection = PricingSelection,
> {
  /** Stable key used for registry lookup and breakdown audit. */
  readonly key: string;
  /** Returns true when this strategy can price the given product. */
  canHandle(context: PricingContext): boolean;
  /** Translates the domain selection into engine modifiers. */
  buildModifiers(
    selection: Readonly<TSelection>,
    context: PricingContext,
  ): ReadonlyArray<PricingModifier>;
}

/**
 * Discount Rule — applied AFTER the base price by the engine, never by
 * a strategy. Allows promo codes, loyalty, tier discounts to compose
 * orthogonally on top of any strategy.
 */
export interface IDiscountRule {
  readonly key: string;
  /** Cheap predicate; engine skips `apply()` when this returns false. */
  isApplicable(
    breakdown: PriceBreakdown,
    context: PricingContext,
  ): boolean;
  /** Returns the discount modifier(s) to merge into the breakdown. */
  apply(
    breakdown: PriceBreakdown,
    context: PricingContext,
  ): ReadonlyArray<PricingModifier>;
}

/* ===================================================================
 * Engine-level errors — typed, never thrown as plain strings.
 * =================================================================== */

export class PricingEngineError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "NO_STRATEGY"
      | "INVALID_QUANTITY"
      | "INVALID_BASE_PRICE"
      | "STRATEGY_FAILED",
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "PricingEngineError";
  }
}
