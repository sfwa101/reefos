/**
 * cartPricingAdapter — Phase 2.G Tests
 * ----------------------------------------------------------------
 * Verifies the three branches of the discriminated union:
 *   (a) "ok"           → engine produced a clean breakdown
 *   (b) "fallback"     → no strategy registered for this product
 *   (c) "engine_error" → strategy matched but blew up (Zero Silent Failure)
 *
 * The adapter must NEVER throw — every error becomes a typed result.
 */

import { describe, expect, it } from "vitest";
import type { Product } from "@/lib/products";
import {
  evaluateCartLineItem,
  isHandledByNewEngine,
} from "../cartPricingAdapter";
import type { MeatSelection } from "../strategies/MeatPricingStrategy";
import type { SweetsSelection } from "../strategies/SweetsPricingStrategy";
import type { WholesaleSelection } from "../strategies/WholesalePricingStrategy";

const buildProduct = (
  overrides: Partial<Product> & Pick<Product, "id" | "source" | "price">,
): Product => ({
  name: "Test Product",
  unit: "1",
  image: "test.jpg",
  category: "test",
  ...overrides,
});

/* ===================================================================
 * (a) kind: "ok"
 * =================================================================== */

describe("cartPricingAdapter — ok branch", () => {
  it("returns a clean breakdown for a supported meat product", () => {
    const product = buildProduct({
      id: "meat-ok-1",
      source: "meat",
      subCategory: "لحوم حمراء",
      price: 100,
    });

    const result = evaluateCartLineItem<MeatSelection>({
      product,
      quantity: 1,
      selection: {
        weight: { id: "1", label: "1 كيلو", factor: 1 },
        prep: { id: "raw", label: "نيء", price: 0, tier: "raw" },
        addonIds: [],
        packagingId: "normal",
      },
      context: { customerTier: "guest" },
    });

    expect(result.kind).toBe("ok");
    if (result.kind !== "ok") return;
    expect(result.breakdown.strategyKey).toBe("meat");
    expect(result.breakdown.unitPrice).toBe(100);
    expect(result.breakdown.grandTotal).toBe(100);
  });

  it("returns ok for a wholesale product with tier breaks", () => {
    const product = buildProduct({
      id: "wh-rice-50",
      source: "wholesale",
      price: 50,
    });
    const result = evaluateCartLineItem<WholesaleSelection>({
      product,
      quantity: 12,
      selection: {
        tierBreaks: [{ minQty: 12, perUnitDiscount: 5 }],
        applyVolumeDeals: false,
      },
      context: { customerTier: "guest" },
    });
    expect(result.kind).toBe("ok");
    if (result.kind !== "ok") return;
    expect(result.breakdown.unitPrice).toBe(45); // 50 - 5
    expect(result.breakdown.lineTotal).toBe(540); // 45 × 12
  });
});

/* ===================================================================
 * (b) kind: "fallback"
 * =================================================================== */

describe("cartPricingAdapter — fallback branch", () => {
  it("returns fallback for a product with no registered strategy", () => {
    const product = buildProduct({
      id: "home-mug-1",
      source: "home",
      price: 30,
    });

    const result = evaluateCartLineItem({
      product,
      quantity: 2,
      selection: {},
    });

    expect(result.kind).toBe("fallback");
    if (result.kind !== "fallback") return;
    expect(result.reason).toBe("no-strategy");
    expect(isHandledByNewEngine(product)).toBe(false);
  });
});

/* ===================================================================
 * (c) kind: "engine_error"  (Zero Silent Failure)
 * =================================================================== */

describe("cartPricingAdapter — engine_error branch", () => {
  it("surfaces STRATEGY_FAILED when sweets Type C is missing booking", () => {
    const cake = buildProduct({
      id: "sweet-cake-c-1",
      source: "sweets",
      subCategory: "تورتات",
      price: 400,
    });

    const result = evaluateCartLineItem<SweetsSelection>({
      product: cake,
      quantity: 1,
      selection: {
        // booking intentionally omitted
      },
      context: { customerTier: "guest" },
    });

    expect(result.kind).toBe("engine_error");
    if (result.kind !== "engine_error") return;
    expect(result.code).toBe("STRATEGY_FAILED");
    expect(result.message).toMatch(/strategy/i);
  });

  it("surfaces INVALID_QUANTITY when quantity is zero", () => {
    const product = buildProduct({
      id: "meat-q0",
      source: "meat",
      subCategory: "لحوم حمراء",
      price: 100,
    });
    const result = evaluateCartLineItem<MeatSelection>({
      product,
      quantity: 0,
      selection: {
        weight: { id: "1", label: "1 كيلو", factor: 1 },
        prep: { id: "raw", label: "نيء", price: 0, tier: "raw" },
        addonIds: [],
        packagingId: "normal",
      },
    });
    expect(result.kind).toBe("engine_error");
    if (result.kind !== "engine_error") return;
    expect(result.code).toBe("INVALID_QUANTITY");
  });
});
