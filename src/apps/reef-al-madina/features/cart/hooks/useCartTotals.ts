/**
 * useCartTotals — Atomized hook (Operation Cart-Atomize).
 *
 * Sovereign totals surface for the cart shell. Delegates to the existing
 * `useCartCalculations` engine (which itself talks to the Cashier Brain
 * for authoritative pricing), so this hook is a thin pass-through that
 * documents the boundary: NO local money math is permitted here — every
 * grand total / discount / wallet split MUST come from the engine.
 */
import { useCartCalculations } from "./useCartCalculations";

type Params = Parameters<typeof useCartCalculations>[0];

export const useCartTotals = (params: Params) => useCartCalculations(params);

export type CartTotalsApi = ReturnType<typeof useCartTotals>;
