/**
 * Maeen kernel adapter — Active Delivery detection.
 * Phase 12.1 — Sovereign Matrix via LogisticsGateway.
 */
import { useQuery } from "@tanstack/react-query";
import { LogisticsExtras } from "@/core/logistics/gateway/LogisticsGateway";

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
    queryFn: async (): Promise<boolean> =>
      LogisticsExtras.hasActiveDelivery(userId!, ACTIVE_NODE_STATUSES),
  });
}
