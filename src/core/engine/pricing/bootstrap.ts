/**
 * Pricing Engine — Bootstrap
 * ----------------------------------------------------------------
 * Single composition root that wires:
 *   • Strategies     (per-domain pricing)
 *   • Discount Rules (cross-cutting, applied after strategies)
 *   • Reward Rules   (Phase 8 — loyalty points, applied after discounts)
 *
 * Idempotent: safe to call from app entry, tests, or SSR — repeated
 * calls do NOT double-register because each strategy/rule key is unique
 * within the engine's Map / ordered list (last write wins for strategies;
 * rules are de-duplicated by key here).
 *
 * Usage:
 *   import { initPricingEngine, pricingEngine } from "@/core/engine/pricing/bootstrap";
 *   initPricingEngine();
 *   const breakdown = pricingEngine.calculate({ product, selection });
 */

import { pricingEngine, type PricingEngine } from "./PricingEngine";
import { MeatPricingStrategy } from "./strategies/MeatPricingStrategy";
import { SweetsPricingStrategy } from "./strategies/SweetsPricingStrategy";
import { WholesalePricingStrategy } from "./strategies/WholesalePricingStrategy";
import { LoyaltyTierDiscount } from "./discounts/LoyaltyTierDiscount";
import { BulkQuantityDiscount } from "./discounts/BulkQuantityDiscount";
import { PointsEarningRule } from "./rewards/PointsEarningRule";

let initialised = false;

/**
 * Wire all strategies, discount rules, and reward rules into the
 * singleton engine. Returns the same singleton for ergonomic chaining
 * in tests.
 */
export function initPricingEngine(): PricingEngine {
  if (initialised) return pricingEngine;

  // Strategies — order does not matter (Map keyed by `.key`).
  pricingEngine
    .registerStrategy(new MeatPricingStrategy())
    .registerStrategy(new SweetsPricingStrategy())
    .registerStrategy(new WholesalePricingStrategy());

  // Discount rules — order DOES matter (sequential application).
  // Loyalty first (broad % on line), then bulk (quantity-based) so that
  // VIP customers see their loyalty cut before any quantity bonus is
  // calculated on top.
  pricingEngine
    .registerDiscountRule(new LoyaltyTierDiscount())
    .registerDiscountRule(new BulkQuantityDiscount());

  // Reward rules — Phase 8. Run AFTER all discounts so points reflect
  // the final amount the customer actually pays.
  pricingEngine.registerRewardRule(new PointsEarningRule());

  initialised = true;
  return pricingEngine;
}

// Re-export for downstream consumers (cart adapter, tests, Hakim audit).
export { pricingEngine };
export type { PricingEngine } from "./PricingEngine";
