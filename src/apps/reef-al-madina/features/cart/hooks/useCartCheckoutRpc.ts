/**
 * Phase 11.1 — Zombie Purge.
 * The legacy `placeOrderAtomic` (place_order_atomic_v2) call is removed.
 * The customer cart now flows exclusively through the Sovereign Router
 * (`process_checkout_sovereign`) via `useSovereignCheckout`.
 *
 * Only `allocateOrderInventory` remains — still used by the orchestrator
 * for best-effort multi-warehouse fulfillment hints.
 */
import { supabase } from "@/integrations/supabase/client";

/** Best-effort multi-warehouse allocation. Non-blocking; logs only on error. */
export const allocateOrderInventory = async (
  orderId: string,
  zoneId: string | null | undefined,
): Promise<void> => {
  // Phase 15.2 — `allocate_order_inventory` RPC was dropped with the legacy
  // orders schema. The Sovereign Router (`process_checkout_sovereign`) now
  // handles allocation atomically inside the checkout transaction. Kept as
  // a no-op so legacy callers don't crash; remove on next cleanup pass.
  void orderId; void zoneId;
  return;
};
