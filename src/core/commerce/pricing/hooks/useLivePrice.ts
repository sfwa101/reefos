/**
 * useLivePrice — Live Pricing Hook
 * ----------------------------------------------------------------
 * Reactive bridge between the UI (CutBuilder, ProductDetail, MealSheet…)
 * and the central PricingEngine. Components pass the current selection
 * (weight, prep, addons, qty…), the hook returns a memoised PriceBreakdown
 * recomputed only when the inputs change.
 *
 * Contract:
 *   • Pure read-only — never mutates product, selection, or context.
 *   • Fail-safe — any PricingEngineError is captured into `error` and
 *     `breakdown` becomes `null`. The hook NEVER throws into render,
 *     so a broken strategy can't crash the page.
 *   • Capability-gated — `canPrice()` is consulted first. When the
 *     engine has no strategy for the product, `supported` is false and
 *     the caller falls back to legacy display logic.
 *   • Idempotent bootstrap — `initPricingEngine()` is called lazily on
 *     first hook invocation (safe across SSR + multiple consumers).
 */

import { useEffect, useMemo, useState } from "react";
import { initPricingEngine, pricingEngine } from "../bootstrap";
import {
  PricingEngineError,
  type PriceBreakdown,
  type PricingContext,
  type PricingInput,
  type PricingSelection,
} from "../types";
import { Tracer } from "@/core/system/observability/Tracer";

// One-shot wiring guard — initPricingEngine is itself idempotent, but
// avoiding the function call entirely after the first hook mount keeps
// React Fast Refresh and SSR cheap.
let bootstrapped = false;
function ensureBootstrapped(): void {
  if (bootstrapped) return;
  initPricingEngine();
  bootstrapped = true;
}

export type LivePriceContext = Omit<PricingContext, "product" | "currency">;

export interface UseLivePriceOptions {
  /** Optional explicit strategy key — bypasses `canHandle` scan. */
  readonly strategyKey?: string;
}

export interface UseLivePriceResult {
  /** True when the engine has a strategy registered for this product. */
  readonly supported: boolean;
  /** Latest successful breakdown, or null when unsupported / errored. */
  readonly breakdown: PriceBreakdown | null;
  /** Engine error from the last calculate() — null on success. */
  readonly error: PricingEngineError | null;
  /** True while the engine is bootstrapping (first mount only). */
  readonly isReady: boolean;
}

/**
 * Compute a live, memoised price breakdown for a product + selection.
 * Inputs MUST be referentially stable (memo / useState) to avoid
 * useless recomputes — the hook's `useMemo` keys on identity.
 */
export function useLivePrice<TSelection extends PricingSelection>(
  product: PricingInput | null | undefined,
  selection: TSelection | null | undefined,
  context?: LivePriceContext,
  options?: UseLivePriceOptions,
): UseLivePriceResult {
  // Bootstrap once. We use state so the first render after wiring
  // re-evaluates supportability (important during SSR → CSR handoff).
  const [isReady, setIsReady] = useState<boolean>(bootstrapped);
  useEffect(() => {
    if (!bootstrapped) {
      ensureBootstrapped();
      setIsReady(true);
    }
  }, []);

  const supported = useMemo<boolean>(() => {
    if (!isReady || !product) return false;
    try {
      return pricingEngine.canPrice(product, options?.strategyKey);
    } catch {
      // canPrice is non-throwing by contract, but defend against custom
      // strategies that violate the contract.
      return false;
    }
  }, [isReady, product, options?.strategyKey]);

  // The actual calculation — memoised on every meaningful input.
  // Returning a tuple lets us surface the error without throwing.
  const { breakdown, error } = useMemo<{
    breakdown: PriceBreakdown | null;
    error: PricingEngineError | null;
  }>(() => {
    if (!supported || !product || !selection) {
      return { breakdown: null, error: null };
    }
    try {
      const result = pricingEngine.calculate<TSelection>({
        product,
        selection,
        context,
        strategyKey: options?.strategyKey,
      });
      return { breakdown: result, error: null };
    } catch (err) {
      // Wrap unknown throws so callers always get a typed error.
      const wrapped =
        err instanceof PricingEngineError
          ? err
          : new PricingEngineError(
              "Unknown pricing engine failure",
              "STRATEGY_FAILED",
              err,
            );
      // eslint-disable-next-line no-console
      Tracer.error("commerce", "useliveprice", { args: ["[useLivePrice]", wrapped] });
      return { breakdown: null, error: wrapped };
    }
  }, [supported, product, selection, context, options?.strategyKey]);

  return { supported, breakdown, error, isReady };
}
