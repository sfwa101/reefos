/**
 * useCartItems — Atomized hook (Operation Cart-Atomize).
 *
 * Owns local cart-line state (lines, count, total, qty mutations).
 * Thin wrapper over `useSharedCartAdapter` so the shared/local cart
 * unification stays in one place. Consumed by the `useCartOrchestrator`
 * facade — UI must NOT use this directly; it must keep going through the
 * orchestrator to preserve the existing public surface.
 */
import { useSharedCartAdapter } from "./useSharedCartAdapter";

export const useCartItems = (sharedCartId: string | null) => {
  return useSharedCartAdapter(sharedCartId);
};

export type CartItemsApi = ReturnType<typeof useCartItems>;
