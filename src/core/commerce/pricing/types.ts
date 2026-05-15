/**
 * Core Pricing Engine — Type Contracts
 * ----------------------------------------------------------------
 * Domain-agnostic, strictly-typed contracts for the new ELITE pricing
 * engine. NO `any`, NO `as unknown`. These types are the SINGLE source
 * of truth that every Strategy and Discount Rule must respect.
 *
 * Built in PARALLEL to legacy `the destroyed legacy pricing module` — nothing here
 * imports from or mutates the live cart pipeline. Wiring is a later phase.
 */

/* ===================================================================
 * PricingInput — narrow, vertical-agnostic contract.
 *
 * Wave P-B Step B-4: the engine no longer accepts the legacy
 * denormalized `Product` view-model. It consumes ONLY the fields it
 * needs to price a line. This makes the engine reusable for VMs,
 * sovereign feeds, snapshots, and synthetic test fixtures.
 *
 * Structural compatibility: the legacy `Product` shape (and the cart
 * `capturedSnapshot`) are both structurally assignable to `PricingInput`,
 * so existing callers (CartRuntime, ButcherSheet, …) need no changes.
 * =================================================================== */
export interface PricingInput {
  /** Stable product identifier (used for receipt/audit and registry lookups). */
  readonly id: string;
  /**
   * Vertical / source label. Kept loose (`string`) on purpose — strategies
   * own the canonical mapping for their own vertical.
   */
  readonly source: string;
  /** Human-readable unit ("كيلو", "علبة", …). Optional for sovereign VMs. */
  readonly unit?: string;
  /** Base unit price in EGP, before any modifier or discount. */
  readonly price: number;
  /** Optional pre-discount price for "static_old_price" badge (read by FlashPriceResolver). */
  readonly oldPrice?: number;
  /** Sub-vertical key — sweets fulfilment type, butchery rule key, etc. */
  readonly subCategory?: string;
  /** Free-form attributes — costPrice, bonusPoints, excludeFromLoyalty, capabilities, … */
  readonly metadata?: Readonly<Record<string, unknown>>;
}

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
  readonly product: Readonly<PricingInput>;
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
  /**
   * Phase 9 — bypass the LossPreventionRule. ONLY a verified admin
   * session may set this. The engine never elevates this on its own.
   */
  readonly adminOverride?: boolean;
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
  /* ---------------- Phase 9 — Profit awareness ---------------- */
  /**
   * Effective cost basis used by the engine for this line.
   * Source of truth, in order:
   *   1. `product.metadata.costPrice` (explicit)
   *   2. fallback: `unitPrice × 0.80 × qty` (default 80% COGS heuristic)
   */
  readonly costPrice: number;
  /** `grandTotal − costPrice` after all discounts + reward valuations. */
  readonly netProfit: number;
  /**
   * Set to true when LossPreventionRule had to roll back discounts to
   * keep the line above the safe profit floor. UI surfaces this as a
   * subtle "تم تعديل الخصم لحماية الربحية" badge.
   */
  readonly isLossPreventionTriggered: boolean;
  /**
   * Optional human-readable trace of WHY loss-prevention fired. Useful
   * for receipts and Hakim audits. Empty string when not triggered.
   */
  readonly lossPreventionReason?: string;
  /**
   * Phase 9.1 — emitted when net profit drops below
   * `MIN_NET_PROFIT_RATIO` of the original line total. The cart UI
   * surfaces this as a "بانتظار موافقة الإدارة" badge and the admin
   * panel uses it to filter pending approvals. Always `false` when
   * `adminOverride === true`.
   */
  readonly requiresAdminApproval: boolean;
  /**
   * Phase 9.1 — when true, NO further discounts (promo codes, future
   * stacked rules) may be applied to this line. Set by the guardrail
   * after a hard-lock decision; consumers must respect it.
   */
  readonly discountLocked: boolean;
  readonly appliedModifiers: ReadonlyArray<PricingModifier>;
  /** Strategy that produced this breakdown — for receipts & audit. */
  readonly strategyKey: string;
}

/* ===================================================================
 * Phase 9 — Profit Guardrail constants
 * =================================================================== */

/** Default COGS ratio when `metadata.costPrice` is missing. */
export const DEFAULT_COST_RATIO = 0.8;
/**
 * Monetary value of a single loyalty point (EGP). Used by
 * LossPreventionRule to convert `pointsEarned` into a comparable cost
 * when computing the total customer-incentive spend per line.
 */
export const POINT_REDEMPTION_VALUE = 0.1;
/** Maximum share of gross profit that can be returned to the customer
 *  via discounts + reward valuations. Above this, the guardrail kicks in. */
export const MAX_INCENTIVE_SHARE_OF_PROFIT = 0.7;
/**
 * Hard floor — minimum acceptable net profit as a share of the
 * original (pre-discount) line total. If the post-discount profit
 * drops below this ratio, the guardrail LOCKS further discounts and
 * raises `requiresAdminApproval`.
 */
export const MIN_NET_PROFIT_RATIO = 0.1;

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
