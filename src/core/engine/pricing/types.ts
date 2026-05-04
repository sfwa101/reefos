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
  /**
   * Optional customer tier — used by discount + reward rules.
   * Aligned with `src/lib/tiers.ts` (5-tier loyalty system).
   * `guest` is reserved for unauthenticated visitors.
   */
  readonly customerTier?:
    | "guest"
    | "bronze"
    | "silver"
    | "gold"
    | "platinum"
    | "vip";
}

/** Customer tiers known to discount + reward rules. */
export type CustomerTierKey = NonNullable<PricingContext["customerTier"]>;

export interface PriceBreakdown {
  readonly unitPrice: number;
  readonly lineTotal: number;
  readonly depositRequired: boolean;
  readonly depositAmount: number;
  readonly crossSellTotal: number;
  readonly feeTotal: number;
  readonly discountTotal: number;
  readonly grandTotal: number;
  /**
   * Loyalty points the customer earns for this line — emitted by reward
   * rules (Phase 8). Always rounded to the nearest integer. Zero when
   * the product opts out via `metadata.excludeFromLoyalty` or when no
   * reward rule applies (e.g. guest checkout).
   */
  readonly pointsEarned: number;
  /**
   * Optional bonus-points badge metadata — set by reward rules when a
   * line earns extra points beyond the base tier multiplier (e.g. an
   * "Offer" product with `metadata.bonusPoints`). UI surfaces this as
   * a "+50 نقطة هدية" chip inside the Cart.
   */
  readonly bonusPoints?: number;
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

/**
 * Reward Rule — Phase 8.
 * Computes loyalty points (and optional bonus chips) AFTER discounts
 * have been applied. Reward rules NEVER mutate prices; they only emit
 * non-monetary outcomes folded into `breakdown.pointsEarned`.
 *
 * Engine pipeline order:
 *   strategy modifiers → discount rules → reward rules
 *
 * This keeps loyalty fully orthogonal to pricing and lets us add new
 * earning programs (referral bonus, weekend ×2, …) without touching
 * any strategy.
 */
export interface RewardOutcome {
  /** Base earned points from this rule (non-negative integer). */
  readonly points: number;
  /** Optional extra "gift" points to advertise as a separate chip. */
  readonly bonusPoints?: number;
}

export interface IRewardRule {
  readonly key: string;
  /** Cheap predicate; engine skips `apply()` when this returns false. */
  isApplicable(
    breakdown: PriceBreakdown,
    context: PricingContext,
  ): boolean;
  apply(
    breakdown: PriceBreakdown,
    context: PricingContext,
  ): RewardOutcome;
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
