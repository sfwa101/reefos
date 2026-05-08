/**
 * Restaurant data-access layer (DAL) — Phase 15.2.
 * Now reads from the Sovereign Catalog via `fetchRestaurantAssets`.
 */
import {
  queryOptions,
  useQuery,
  type UseQueryResult,
} from "@tanstack/react-query";
import { toast } from "sonner";
export interface RestoProduct {
  readonly id: string;
  readonly name: string;
  readonly brand: string | null;
  readonly price: number;
  readonly image: string | null;
  readonly rating: number | null;
  readonly source: string | null;
  readonly fulfillment_type: string | null;
  readonly description: string | null;
  readonly metadata: Record<string, unknown> | null;
}
import { fetchRestaurantAssets } from "@/lib/sovereignCatalog";

const RESTAURANTS_QUERY_KEY = ["restaurants"] as const;
const FIVE_MINUTES = 5 * 60 * 1000;

export async function fetchRestaurants(): Promise<RestoProduct[]> {
  const rows = await fetchRestaurantAssets();
  return rows as unknown as RestoProduct[];
}

export const restaurantQueryOptions = () =>
  queryOptions<RestoProduct[], Error>({
    queryKey: RESTAURANTS_QUERY_KEY,
    queryFn: fetchRestaurants,
    staleTime: FIVE_MINUTES,
    gcTime: FIVE_MINUTES * 2,
    refetchOnWindowFocus: false,
  });

export function useRestaurantsQuery(): UseQueryResult<RestoProduct[], Error> {
  const result = useQuery(restaurantQueryOptions());
  if (result.isError && result.error) {
    toast.error("تعذّر تحميل المطاعم");
  }
  return result;
}

export { RESTAURANTS_QUERY_KEY };
