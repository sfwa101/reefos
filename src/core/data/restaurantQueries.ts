/**
 * Restaurant data-access layer (DAL).
 * ----------------------------------------------------------------
 * Centralises the Supabase fetch + the TanStack Query wrapper for
 * restaurant products. Components should NEVER call `supabase.from(...)`
 * for restaurant data directly — they go through `useRestaurantsQuery()`
 * (or `restaurantQueryOptions` from a route loader) so that:
 *   • caching, deduplication, and background refetch are handled by
 *     React Query (5-minute SWR window),
 *   • the query key (`["restaurants"]`) is a single source of truth that
 *     mutations / invalidations / route loaders can target,
 *   • error & loading states are typed and uniform across consumers.
 */

import {
  queryOptions,
  useQuery,
  type UseQueryResult,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { RestoProduct } from "@/modules/restaurants/types";

const RESTAURANTS_QUERY_KEY = ["restaurants"] as const;
const FIVE_MINUTES = 5 * 60 * 1000;

/**
 * Raw Supabase fetch — used by `restaurantQueryOptions` and re-exported
 * for tests / direct SSR pre-fetch. Throws on Supabase errors so React
 * Query can surface them via `error` (no silent empty arrays). UI toasts
 * are emitted from the hook layer, not here, to keep this function
 * side-effect-free for SSR / loaders.
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
 * Single source of truth for the restaurants query.
 * Used by:
 *   • `useRestaurantsQuery()` — component-side subscription
 *   • `route.loader` — `queryClient.ensureQueryData(restaurantQueryOptions())`
 *     for parallel prefetch during navigation (zero-wait nav)
 *
 * Exporting it as a factory (() => queryOptions(...)) keeps the call-sites
 * symmetric with TanStack's recommended pattern and leaves room for
 * parameterised variants later (e.g. by brand) without breaking callers.
 */
export const restaurantQueryOptions = () =>
  queryOptions<RestoProduct[], Error>({
    queryKey: RESTAURANTS_QUERY_KEY,
    queryFn: fetchRestaurants,
    staleTime: FIVE_MINUTES,
    gcTime: FIVE_MINUTES * 2,
    refetchOnWindowFocus: false,
  });

/**
 * Stable React Query hook for the restaurant catalog.
 * SWR window is 5 minutes — long enough to absorb tab-switches and
 * intra-app navigations without re-hitting Supabase, short enough that
 * menu/price edits land within one nav cycle.
 */
export function useRestaurantsQuery(): UseQueryResult<RestoProduct[], Error> {
  const result = useQuery(restaurantQueryOptions());

  // Side-effect: surface fetch errors as a single toast per failure.
  // We do this at the hook layer so SSR / loader pre-fetch stays silent.
  if (result.isError && result.error) {
    toast.error("تعذّر تحميل المطاعم");
  }

  return result;
}

export { RESTAURANTS_QUERY_KEY };
