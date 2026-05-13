/**
 * useDefaultDeliveryMethod
 * ----------------------------------------------------------------
 * Loads the default `standard` delivery method via LogisticsGateway.
 * Wave B-3: direct supabase.from("delivery_methods") removed.
 */
import { useQuery } from "@tanstack/react-query";
import { LogisticsGateway } from "@/core/logistics";

export function useDefaultDeliveryMethod() {
  return useQuery({
    queryKey: ["delivery_method", "standard"] as const,
    queryFn: () => LogisticsGateway.getDefaultStandardDeliveryMethod(),
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
  });
}
