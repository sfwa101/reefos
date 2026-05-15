/**
 * PricingEngine — Unit Tests (Phase 2.E)
 * ----------------------------------------------------------------
 * Mathematical & financial proof of the engine's correctness BEFORE
 * wiring it into CartRuntime. Covers:
 *   1. Baseline      — passthrough strategy (engine doesn't break simple SKUs)
 *   2. Worst-case    — Meat + custom weight + addons + VIP loyalty + bulk
 *   3. Constraints   — Sweets Type C deposit math + explicit throw on missing booking
 *
 * Customer mock name: "Hassan" (per spec).
 */

import { beforeAll, describe, expect, it } from "vitest";
import {
  PricingEngine,
  pricingEngine,
} from "../PricingEngine";
import { initPricingEngine } from "../bootstrap";
import {
  PricingEngineError,
  type IPricingStrategy,
  type PricingContext,
  type PricingInput,
  type PricingModifier,
  type PricingSelection,
} from "../types";
import type { WeighedSelection } from "../strategies/WeighedPricingStrategy";
import type { CustomFulfillmentSelection } from "../strategies/CustomFulfillmentPricingStrategy";

/* ---------- Test fixtures ---------- */

const HASSAN = { name: "Hassan", tier: "vip" as const };

/** Build a minimal capability-keyed PricingInput fixture. */
const buildProduct = (
  overrides: Partial<PricingInput> & Pick<PricingInput, "id" | "source" | "price">,
): PricingInput => ({
  unit: "1",
  ...overrides,
});

/** Inline passthrough strategy used only by the baseline scenario. */
class NoopStrategy implements IPricingStrategy<PricingSelection> {
  readonly key = "noop";
  canHandle(ctx: PricingContext): boolean {
    return ctx.product.source === "supermarket";
  }
  buildModifiers(): ReadonlyArray<PricingModifier> {
    return [];
  }
}

beforeAll(() => {
  // Wire all production strategies + discount rules into the singleton.
  initPricingEngine();
  // Register the noop strategy used only here.
  pricingEngine.registerStrategy(new NoopStrategy());
});

/* ===================================================================
 * Scenario 1 — Baseline
 * =================================================================== */

describe("Scenario 1 — Baseline (no modifiers)", () => {
  it("returns base price × quantity for a simple supermarket SKU", () => {
    const product = buildProduct({
      id: "sm-rice-1",
      source: "supermarket",
      price: 50,
    });

    const result = pricingEngine.calculate({
      product,
      selection: { quantity: 2 },
      strategyKey: "noop",
      context: { customerTier: "guest" }, // no loyalty, qty<6 → no bulk
    });

    expect(result.unitPrice).toBe(50);
    expect(result.lineTotal).toBe(100);
    expect(result.discountTotal).toBe(0);
    expect(result.depositRequired).toBe(false);
    expect(result.grandTotal).toBe(100);
    expect(result.strategyKey).toBe("noop");
  });
});

/* ===================================================================
 * Scenario 2 — Worst case: Meat + VIP loyalty + Bulk discount
 *
 * Math (all values rounded to 2 decimals, EGP):
 *   base price       = 100
 *   weight (1 kg)    × factor 1                     →  100
 *   prep "cubes"     + 10                           →  unitPrice = 110
 *   addons           soup-bone (+8) + vacuum (+15)  →  +23 line addon
 *   qty              = 12
 *
 *   Step A (strategy fold):
 *     lineTotal = 110 × 12 + 23 = 1343
 *
 *   Step B (loyalty 5% of line):
 *     refold → unit=110, line=1320; -5% = -66 → 1254; +addons 23 = 1277
 *     discountTotal = 66
 *
 *   Step C (bulk 6% on 12+):
 *     refold → unit=110, line=1320; -5% loyalty = -66 → 1254;
 *              -6% bulk = -75.24 → 1178.76; +addons 23 = 1201.76
 *     discountTotal = 66 + 75.24 = 141.24
 *
 *   grandTotal = 1201.76
 * =================================================================== */

describe("Scenario 2 — Meat (worst case composition)", () => {
  it(`prices Hassan's VIP bulk meat order with weight + prep + addons + loyalty + bulk`, () => {
    const product = buildProduct({
      id: "meat-redmeat-1",
      source: "meat",
      subCategory: "لحوم حمراء",
      price: 100,
      // Customer name (${HASSAN.name}) intentionally not on PricingInput.
    });

    const selection: WeighedSelection = {
      quantity: 12,
      weight: { id: "1", label: "1 كيلو", factor: 1 },
      prep: { id: "cubes", label: "تقطيع مكعبات", price: 10, tier: "clean" },
      addonIds: ["soup-bone"],
      packagingId: "vacuum",
    };

    const result = pricingEngine.calculate<WeighedSelection>({
      product,
      selection,
      context: { customerTier: HASSAN.tier },
    });

    expect(result.strategyKey).toBe("meat");
    expect(result.unitPrice).toBe(110);
    expect(result.discountTotal).toBeCloseTo(141.24, 2);
    expect(result.lineTotal).toBeCloseTo(1201.76, 2);
    expect(result.grandTotal).toBeCloseTo(1201.76, 2);
    expect(result.depositRequired).toBe(false);

    // Audit trail must contain BOTH discount rules (loyalty + bulk).
    const ids = result.appliedModifiers.map((m) => m.id);
    expect(ids).toContain("loyalty:vip");
    expect(ids).toContain("bulk:12");
  });

  it("does NOT apply loyalty for guest customers", () => {
    const product = buildProduct({
      id: "meat-redmeat-2",
      source: "meat",
      subCategory: "لحوم حمراء",
      price: 100,
    });
    const selection: WeighedSelection = {
      quantity: 1,
      weight: { id: "1", label: "1 كيلو", factor: 1 },
      prep: { id: "raw", label: "نيء", price: 0, tier: "raw" },
      addonIds: [],
      packagingId: "normal",
    };
    const result = pricingEngine.calculate<WeighedSelection>({
      product,
      selection,
      context: { customerTier: "guest" },
    });
    expect(result.discountTotal).toBe(0);
    expect(result.grandTotal).toBe(100);
  });
});

/* ===================================================================
 * Scenario 3 — Sweets Type C (mandatory booking)
 * =================================================================== */

describe("Scenario 3 — Sweets Type C (deposit + zero silent failures)", () => {
  const cake = buildProduct({
    id: "sweet-cake-large",
    source: "sweets",
    subCategory: "تورتات", // → Type C
    price: 400,
  });

  it("computes a 50% deposit when booking is provided and subtotal ≥ 300", () => {
    const selection: CustomFulfillmentSelection = {
      quantity: 1,
      booking: { date: "2026-05-10", slotId: "morning" },
    };

    const result = pricingEngine.calculate<CustomFulfillmentSelection>({
      product: cake,
      selection,
      context: { customerTier: "guest" },
    });

    expect(result.strategyKey).toBe("sweets");
    expect(result.depositRequired).toBe(true);
    expect(result.depositAmount).toBe(200); // 400 × 0.5
    expect(result.lineTotal).toBe(400);
    expect(result.grandTotal).toBe(600); // line + deposit
  });

  it("THROWS a typed error when Type C booking is missing (no silent failure)", () => {
    const selection: CustomFulfillmentSelection = {
      quantity: 1,
      // booking intentionally omitted
    };

    let caught: unknown;
    try {
      pricingEngine.calculate<CustomFulfillmentSelection>({
        product: cake,
        selection,
        context: { customerTier: "guest" },
      });
    } catch (e) {
      caught = e;
    }

    // Engine wraps strategy throws as a typed PricingEngineError(STRATEGY_FAILED)
    // — the original "requires a booking" message lives on `cause`.
    expect(caught).toBeInstanceOf(PricingEngineError);
    const err = caught as PricingEngineError;
    expect(err.code).toBe("STRATEGY_FAILED");
    expect((err.cause as Error)?.message).toMatch(/requires a booking/);
  });
});

/* ===================================================================
 * Sanity — engine throws on unknown product
 * =================================================================== */

describe("Engine guards", () => {
  it("throws PricingEngineError when no strategy can handle the product", () => {
    const isolated = new PricingEngine(); // empty registry
    const product = buildProduct({
      id: "x-unknown",
      source: "home",
      price: 10,
    });
    expect(() =>
      isolated.calculate({ product, selection: { quantity: 1 } }),
    ).toThrow(/No strategy/);
  });
});
