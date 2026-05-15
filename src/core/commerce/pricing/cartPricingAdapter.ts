/**
 * Cart Pricing Adapter — Phase 2.F
 * ----------------------------------------------------------------
 * Thin, READ-ONLY bridge between the legacy `CartRuntime` and the new
 * `PricingEngine`. This file is intentionally NOT wired anywhere yet —
 * it exists so we can review the fallback contract before SEV-0 risk.
 *
 * Decision tree (per cart line item):
 *
 *   ┌──────────────────────────────┐
 *   │ engine.canPrice(product) ?   │
 *   └─────┬─────────────────────┬──┘
 *         │ yes                 │ no
 *         ▼                     ▼
 *   try engine.calculate()   return { kind: "fallback" }
 *         │                  → CartRuntime keeps using legacy
 *         │                    `pricingEngine.ts` / `pricingAdapters.ts`
 *         ▼
 *   ┌───────────────────────┐
 *   │ success → "ok"        │
 *   │ PricingEngineError    │
 *   │   → "engine_error"    │  (surfaced verbatim to UI;
 *   │ unknown error         │     never silently swallowed)
 *   │   → "engine_error"    │
 *   └───────────────────────┘
 *
 * Guarantees:
 *   • Pure function — no I/O, no globals beyond the engine singleton.
 *   • Never throws. Returns a discriminated union for the caller to switch on.
 *   • Lazy bootstrap — adapter idempotently calls `initPricingEngine()`
 *     so first cart use after cold-start cannot race the engine wiring.
 *   • Strategy is auto-resolved via `canHandle()` — callers MAY pass an
 *     explicit `strategyKey` (e.g. force "wholesale" for a B2B account).
 */

import { initPricingEngine, pricingEngine } from "./bootstrap";
import {
  PricingEngineError,
  type PriceBreakdown,
  type PricingContext,
  type PricingInput,
  type PricingSelection,
} from "./types";

/* ===================================================================
 * Public result contract — discriminated union for exhaustive handling.
 * =================================================================== */

export type CartPricingResult =
  /** Engine produced a clean breakdown. Use `breakdown.grandTotal` etc. */
  | { readonly kind: "ok"; readonly breakdown: PriceBreakdown }
  /** No strategy registered for this product → caller uses legacy path. */
  | { readonly kind: "fallback"; readonly reason: "no-strategy" }
  /** Strategy matched but pricing failed → surface to user, do NOT silently fall back. */
  | {
      readonly kind: "engine_error";
      readonly code: PricingEngineError["code"] | "UNKNOWN";
      readonly message: string;
      readonly cause?: unknown;
    };

/* ===================================================================
 * Input contract — matches the legacy CartLineItem shape loosely so the
 * adapter can be called from anywhere without importing cart types.
 * =================================================================== */

export interface EvaluateLineInput<
  TSelection extends PricingSelection = PricingSelection,
> {
  readonly product: PricingInput;
  /** Quantity is duplicated into `selection.quantity` for engine validation. */
  readonly quantity: number;
  /** Domain selection (meat prep, sweets booking, wholesale tiers …). */
  readonly selection?: Omit<TSelection, "quantity">;
  /** Optional context — customer tier, zone, etc. */
  readonly context?: Omit<PricingContext, "product" | "currency">;
  /** Force a specific strategy key. Skips canHandle() resolution. */
  readonly strategyKey?: string;
}

/* ===================================================================
 * Lazy idempotent bootstrap. Calling repeatedly is a no-op (the
 * `initialised` flag inside bootstrap.ts prevents double registration).
 * =================================================================== */

let bootstrapped = false;
function ensureEngineReady(): void {
  if (bootstrapped) return;
  initPricingEngine();
  bootstrapped = true;
}

/* ===================================================================
 * Main entry point — pure, never throws.
 * =================================================================== */

export function evaluateCartLineItem<
  TSelection extends PricingSelection = PricingSelection,
>(input: EvaluateLineInput<TSelection>): CartPricingResult {
  ensureEngineReady();

  const { product, quantity, selection, context, strategyKey } = input;

  // 1. Probe — is there ANY strategy for this product?
  if (!pricingEngine.canPrice(product, strategyKey)) {
    return { kind: "fallback", reason: "no-strategy" };
  }

  // 2. Build the full selection (selection + quantity, frozen to be safe).
  const fullSelection = {
    ...(selection ?? {}),
    quantity,
  } as unknown as TSelection;

  // 3. Calculate inside a try/catch — engine errors never bubble past here.
  try {
    const breakdown = pricingEngine.calculate<TSelection>({
      product,
      selection: fullSelection,
      context,
      strategyKey,
    });
    return { kind: "ok", breakdown };
  } catch (err) {
    if (err instanceof PricingEngineError) {
      return {
        kind: "engine_error",
        code: err.code,
        message: err.message,
        cause: err.cause,
      };
    }
    // Unknown shape — wrap defensively. Still surface to UI.
    return {
      kind: "engine_error",
      code: "UNKNOWN",
      message: err instanceof Error ? err.message : String(err),
      cause: err,
    };
  }
}

/* ===================================================================
 * Convenience helper — one-shot probe used by UI components that need
 * to render a "Powered by new engine" chip without computing the full
 * breakdown. Cheap; safe to call in render.
 * =================================================================== */

export function isHandledByNewEngine(
  product: PricingInput,
  strategyKey?: string,
): boolean {
  ensureEngineReady();
  return pricingEngine.canPrice(product, strategyKey);
}
