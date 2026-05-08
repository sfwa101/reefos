/**
 * Maeen kernel adapter — Active Delivery detection.
 * --------------------------------------------------
 * Phase 12.1 — Barq Sovereignty: legacy `orders` read purged.
 * Now reads from the Sovereign Matrix: a delivery is "active" when the
 * customer has any `salsabil_master_orders` row with at least one
 * `salsabil_fulfillment_nodes` whose status is not yet terminal.
 *
 * Stable cache key: ["maeen", "active-delivery", userId]
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const ACTIVE_NODE_STATUSES = [
  "pending",
  "confirmed",
  "preparing",
  "ready_for_pickup",
  "out_for_delivery",
] as const;

export function useActiveDelivery(userId: string | null | undefined) {
  return useQuery({
    queryKey: ["maeen", "active-delivery", userId ?? "_anon"],
    enabled: Boolean(userId),
    staleTime: 60_000,
    queryFn: async (): Promise<boolean> => {
      // Step 1: master orders for this customer
      const { data: masters, error: mErr } = await supabase
        .from("salsabil_master_orders")
        .select("id")
        .eq("customer_id", userId!);
      if (mErr) throw mErr;
      const masterIds = (masters ?? []).map((m) => m.id);
      if (masterIds.length === 0) return false;

      // Step 2: any non-terminal fulfillment node?
      const { count, error } = await supabase
        .from("salsabil_fulfillment_nodes")
        .select("id", { count: "exact", head: true })
        .in("master_order_id", masterIds)
        .in("status", ACTIVE_NODE_STATUSES as unknown as string[]);
      if (error) throw error;
      return (count ?? 0) > 0;
    },
  });
}
