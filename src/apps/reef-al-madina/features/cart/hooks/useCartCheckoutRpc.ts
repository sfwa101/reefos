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
  try {
    const { error } = await supabase.rpc("allocate_order_inventory", {
      _order_id: orderId,
      _zone: zoneId ?? undefined,
    });
    if (error) console.warn("[allocation] failed", error);
  } catch (e) {
    console.warn("[allocation] exception", e);
  }
};
