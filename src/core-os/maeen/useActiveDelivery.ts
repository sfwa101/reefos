/**
 * Maeen kernel adapter — Active Delivery detection.
 * --------------------------------------------------
 * Phase 2 · V-2 fix: the Maeen Hub UI no longer touches Supabase directly.
 * It consumes this single TanStack-Query-cached hook, which owns the
 * orders read and exposes a stable boolean signal.
 *
 * Stable cache key: ["maeen", "active-delivery", userId]
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const ACTIVE_STATUSES = ["pending", "confirmed", "preparing", "out_for_delivery"] as const;

export function useActiveDelivery(userId: string | null | undefined) {
  return useQuery({
    queryKey: ["maeen", "active-delivery", userId ?? "_anon"],
    enabled: Boolean(userId),
    staleTime: 60_000,
    queryFn: async (): Promise<boolean> => {
      const { count, error } = await supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId!)
        .in("status", ACTIVE_STATUSES as unknown as string[]);
      if (error) throw error;
      return (count ?? 0) > 0;
    },
  });
}
