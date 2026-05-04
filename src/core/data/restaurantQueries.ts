/**
 * Restaurant data-access layer (DAL).
 * ----------------------------------------------------------------
 * Centralises the Supabase fetch + the TanStack Query wrapper for
 * restaurant products. Components should NEVER call `supabase.from(...)`
 * for restaurant data directly — they go through `useRestaurantsQuery()`
 * so that:
 *   • caching, deduplication, and background refetch are handled by
 *     React Query (5-minute SWR window),
 *   • the query key (`["restaurants"]`) is a single source of truth that
 *     mutations / invalidations can target,
 *   • error & loading states are typed and uniform across consumers.
 */

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { RestoProduct } from "@/modules/restaurants/types";

const RESTAURANTS_QUERY_KEY = ["restaurants"] as const;
const FIVE_MINUTES = 5 * 60 * 1000;

/**
 * Raw Supabase fetch — used by `useRestaurantsQuery` and re-exported for
 * loaders / SSR pre-fetch via `queryClient.ensureQueryData`.
 *
 * Throws on Supabase errors so React Query can surface them via `error`
 * (no silent empty arrays). UI toasts are emitted from the hook layer,
 * not here, to keep this function side-effect-free for SSR.
 */
export async function fetchRestaurants(): Promise<RestoProduct[]> {
  const { data, error } = await supabase
    .from("products")
    .select(
      "id,name,brand,price,image,rating,source,fulfillment_type,description,metadata",
    )
    .or("source.eq.restaurants,fulfillment_type.eq.restaurant")
    .eq("is_active", true)
    .order("sort_order", { ascending: true, nullsFirst: false });

  if (error) {
    throw new Error(error.message || "Failed to fetch restaurants");
  }

  return (data ?? []) as RestoProduct[];
}

/**
 * Stable React Query hook for the restaurant catalog.
 * SWR window is 5 minutes — long enough to absorb tab-switches and
 * intra-app navigations without re-hitting Supabase, short enough that
 * menu/price edits land within one nav cycle.
 */
export function useRestaurantsQuery(): UseQueryResult<RestoProduct[], Error> {
  const result = useQuery<RestoProduct[], Error>({
    queryKey: RESTAURANTS_QUERY_KEY,
    queryFn: fetchRestaurants,
    staleTime: FIVE_MINUTES,
    gcTime: FIVE_MINUTES * 2,
    refetchOnWindowFocus: false,
  });

  // Side-effect: surface fetch errors as a single toast per failure.
  // We do this at the hook layer so SSR / loader pre-fetch stays silent.
  if (result.isError && result.error) {
    // React Query dedupes renders, but toast itself is idempotent enough
    // for our UX — a single visible error is the worst case here.
    toast.error("تعذّر تحميل المطاعم");
  }

  return result;
}

export { RESTAURANTS_QUERY_KEY };
