/**
 * Core Pricing Engine — Orchestrator
 * ----------------------------------------------------------------
 * Coordinates Strategies (per domain) and Discount Rules (cross-cutting)
 * via Dependency Injection. ZERO domain knowledge lives in this file —
 * adding a new vertical (e.g. flowers, bakery) means writing a strategy
 * and registering it; this file does not change.
 *
 * Pipeline (deterministic, audit-friendly):
 *   1. Resolve strategy   → registry lookup or `canHandle` scan
 *   2. Build modifiers    → strategy.buildModifiers(selection, ctx)
 *   3. Compute base       → fold modifiers via the pure pipeline below
 *   4. Apply discounts    → each registered IDiscountRule (in order)
 *   5. Return breakdown   → immutable, with strategyKey for receipts
 */

import type { PricingInput } from "./types";
import {
  PricingEngineError,
  DEFAULT_COST_RATIO,
  type IDiscountRule,
  type IPricingStrategy,
  type IRewardRule,
  type PriceBreakdown,
  type PricingContext,
  type PricingModifier,
  type PricingSelection,
} from "./types";
import { LossPreventionRule } from "./guardrails/LossPreventionRule";

const lossPreventionRule = new LossPreventionRule();

/** Reads `product.metadata.costPrice` (per-unit) when present. */
function readCostPerUnit(product: PricingInput): number | null {
  const meta = (product as { metadata?: Readonly<Record<string, unknown>> })
    .metadata;
  if (!meta) return null;
  const v = meta["costPrice"];
  return typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : null;
}

const round = (n: number): number => Math.round(n * 100) / 100;

/* ===================================================================
 * Pure pipeline — folds modifiers into a PriceBreakdown.
 * Extracted as a free function so unit tests can target it directly.
 * =================================================================== */

function foldModifiers(
  basePrice: number,
  qty: number,
  modifiers: ReadonlyArray<PricingModifier>,
  strategyKey: string,
): PriceBreakdown {
  if (!Number.isFinite(basePrice) || basePrice < 0) {
    throw new PricingEngineError(
      `Invalid base price: ${basePrice}`,
      "INVALID_BASE_PRICE",
    );
  }
  if (!Number.isInteger(qty) || qty < 1) {
    throw new PricingEngineError(
      `Invalid quantity: ${qty}`,
      "INVALID_QUANTITY",
    );
  }

  let unitPrice = basePrice;
  let lineAddons = 0;
  let depositAmount = 0;
  let crossSellTotal = 0;
  let feeTotal = 0;
  let discountTotal = 0;
  let depositRequired = false;

  // 1. multiplicative
  for (const m of modifiers) {
    if (m.kind === "weight_factor") unitPrice *= m.amount;
  }
  // 2. additive per-unit
  for (const m of modifiers) {
    if (m.kind === "unit_delta") unitPrice += m.amount;
  }
  // 3. per-unit discounts (meta.scope === "unit")
  for (const m of modifiers) {
    if (m.kind !== "discount") continue;
    if (m.meta?.scope !== "unit") continue;
    const value = m.percent ? unitPrice * m.amount : m.amount;
    unitPrice = Math.max(0, unitPrice - value);
    discountTotal += value * qty;
  }

  unitPrice = round(unitPrice);
  let lineTotal = unitPrice * qty;

  // 4. line-level
  for (const m of modifiers) {
    switch (m.kind) {
      case "line_addon":  lineAddons   += m.amount; break;
      case "fee":         feeTotal     += m.amount; break;
      case "deposit":
        depositRequired = true;
        depositAmount  += m.amount;
        break;
      case "cross_sell":  crossSellTotal += m.amount; break;
      case "discount": {
        if (m.meta?.scope === "unit") break;
        const value = m.percent ? lineTotal * m.amount : m.amount;
        lineTotal = Math.max(0, lineTotal - value);
        discountTotal += value;
        break;
      }
      // weight_factor + unit_delta already consumed
      case "weight_factor":
      case "unit_delta":
        break;
    }
  }

  lineTotal      = round(lineTotal + lineAddons);
  depositAmount  = round(depositAmount);
  crossSellTotal = round(crossSellTotal);
  feeTotal       = round(feeTotal);
  discountTotal  = round(discountTotal);
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
    pointsEarned: 0,
    costPrice: 0,
    netProfit: 0,
    isLossPreventionTriggered: false,
    requiresAdminApproval: false,
    discountLocked: false,
    appliedModifiers: modifiers,
    strategyKey,
  };
}

/**
 * Phase 9 — derive the cost basis for a line. Uses explicit
 * `metadata.costPrice` when present, otherwise falls back to the
 * configured `DEFAULT_COST_RATIO` of the post-discount unit price.
 */
function deriveCostPrice(
  product: PricingInput,
  unitPrice: number,
  qty: number,
): number {
  const explicit = readCostPerUnit(product);
  const perUnit = explicit ?? unitPrice * DEFAULT_COST_RATIO;
  return round(perUnit * qty);
}

/* ===================================================================
 * Engine class — DI container for Strategies & Discount Rules.
 * =================================================================== */

export class PricingEngine {
  private readonly strategies = new Map<string, IPricingStrategy<PricingSelection>>();
  private readonly discountRules: IDiscountRule[] = [];
  private readonly rewardRules: IRewardRule[] = [];

  /** Register a strategy. Last registration with the same key wins. */
  registerStrategy<T extends PricingSelection>(
    strategy: IPricingStrategy<T>,
  ): this {
    // Safe upcast: IPricingStrategy is contravariant in TSelection only at
    // the call boundary, and we only invoke buildModifiers via the engine
    // which always passes the matching selection type.
    this.strategies.set(
      strategy.key,
      strategy as unknown as IPricingStrategy<PricingSelection>,
    );
    return this;
  }

  /** Register a discount rule. Applied in registration order. */
  registerDiscountRule(rule: IDiscountRule): this {
    this.discountRules.push(rule);
    return this;
  }

  /** Register a reward rule. Applied in registration order, AFTER discounts. */
  registerRewardRule(rule: IRewardRule): this {
    this.rewardRules.push(rule);
    return this;
  }

  /**
   * Non-throwing capability probe. The cart adapter calls this before
   * `calculate()` to decide whether to delegate to the new engine or
   * fall back to the legacy pricing pipeline.
   */
  canPrice(product: PricingInput, explicitKey?: string): boolean {
    if (explicitKey) return this.strategies.has(explicitKey);
    const ctx: PricingContext = { product, currency: "EGP" };
    for (const s of this.strategies.values()) {
      try {
        if (s.canHandle(ctx)) return true;
      } catch {
        // A misbehaving strategy must NEVER block other strategies.
        continue;
      }
    }
    return false;
  }

  /** Resolve a strategy explicitly by key, or fall back to canHandle scan. */
  private resolveStrategy(
    explicitKey: string | undefined,
    context: PricingContext,
  ): IPricingStrategy<PricingSelection> {
    if (explicitKey) {
      const s = this.strategies.get(explicitKey);
      if (!s) {
        throw new PricingEngineError(
          `No strategy registered with key "${explicitKey}"`,
          "NO_STRATEGY",
        );
      }
      return s;
    }
    for (const s of this.strategies.values()) {
      if (s.canHandle(context)) return s;
    }
    throw new PricingEngineError(
      `No strategy can handle product "${context.product.id}" (source=${context.product.source})`,
      "NO_STRATEGY",
    );
  }

  /**
   * Main entry point. Type parameter `T` keeps selection strongly typed
   * at the call site (e.g. `engine.calculate<WeighedSelection>(...)`).
   */
  calculate<T extends PricingSelection>(input: {
    product: PricingInput;
    selection: T;
    context?: Omit<PricingContext, "product" | "currency">;
    strategyKey?: string;
  }): PriceBreakdown {
    const context: PricingContext = {
      product: input.product,
      currency: "EGP",
      ...input.context,
    };

    const strategy = this.resolveStrategy(input.strategyKey, context);

    let modifiers: ReadonlyArray<PricingModifier>;
    try {
      modifiers = strategy.buildModifiers(
        input.selection as unknown as PricingSelection,
        context,
      );
    } catch (cause) {
      throw new PricingEngineError(
        `Strategy "${strategy.key}" failed to build modifiers`,
        "STRATEGY_FAILED",
        cause,
      );
    }

    const base = foldModifiers(
      input.product.price,
      input.selection.quantity,
      modifiers,
      strategy.key,
    );

    // Apply discount rules sequentially. Each rule sees the latest breakdown.
    let current = base;
    for (const rule of this.discountRules) {
      if (!rule.isApplicable(current, context)) continue;
      const extra = rule.apply(current, context);
      if (extra.length === 0) continue;
      current = foldModifiers(
        input.product.price,
        input.selection.quantity,
        [...current.appliedModifiers, ...extra],
        strategy.key,
      );
    }

    // Phase 8 — Apply reward rules. Rewards never mutate prices; they
    // accumulate `pointsEarned` (and optional bonusPoints) on top of the
    // final breakdown so loyalty stays orthogonal to pricing.
    let pointsEarned = 0;
    let bonusPoints = 0;
    for (const rule of this.rewardRules) {
      if (!rule.isApplicable(current, context)) continue;
      const outcome = rule.apply(current, context);
      pointsEarned += Math.max(0, Math.round(outcome.points));
      if (outcome.bonusPoints) {
        bonusPoints += Math.max(0, Math.round(outcome.bonusPoints));
      }
    }
    if (pointsEarned > 0 || bonusPoints > 0) {
      current = {
        ...current,
        pointsEarned,
        ...(bonusPoints > 0 ? { bonusPoints } : {}),
      };
    }

    // Phase 9 — Profit awareness. Cost basis comes from
    // `metadata.costPrice` or falls back to DEFAULT_COST_RATIO.
    const costPrice = deriveCostPrice(
      input.product,
      base.unitPrice,
      input.selection.quantity,
    );
    current = {
      ...current,
      costPrice,
      netProfit: round(current.grandTotal - costPrice),
    };

    // Phase 9 — Final guardrail. Original (pre-discount) line total
    // equals the freshly-folded `base.lineTotal` (no discount rules
    // had run at that point).
    current = lossPreventionRule.evaluate(current, context, base.lineTotal);
    return current;
  }
}


/* ===================================================================
 * Default singleton — strategies are wired in a separate `bootstrap.ts`
 * during the wiring phase (Phase 2.B). Exported here so tests and the
 * eventual cart adapter share the same instance.
 * =================================================================== */

export const pricingEngine = new PricingEngine();

export { foldModifiers };
