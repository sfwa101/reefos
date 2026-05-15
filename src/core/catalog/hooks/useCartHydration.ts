/**
 * useCartHydration — Wave P-B (Static Catalog Killer).
 *
 * The Cart store persists *identity + intent + a thin display snapshot*
 * (productId, variantId, qty, capturedPrice, capturedName, capturedImage).
 * It deliberately does NOT keep a live `Product` object.
 *
 * This hook is the canonical way for cart UI / orchestrators to obtain
 * fresh `ProductCardVM`s for the persisted line ids. It batches every
 * id in the current cart into a single `catalogGateway.getManyById(...)`
 * call, caches the result under a stable TanStack Query key
 * (`["cart-hydration", sortedIds.join("|")]`), and exposes a
 * `lookup(productId)` helper for O(1) per-line resolution in render.
 *
 * Offline / loading fallback:
 *   - If the query is loading, still pending, or the upstream entry is
 *     missing, callers MUST fall back to `capturedName` / `capturedImage`
 *     stored on the line. Never fail the render — the cart must remain
 *     usable offline (the snapshot is what makes that possible).
 *
 * Article 3 compliance:
 *   - Reads only flow through `catalogGateway`.
 *   - No direct supabase or `@/lib/products` references.
 *   - The DEV watchdog will not fire on this path.
 */
import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import { catalogGateway } from "@/core/catalog/gateway/SovereignCatalogGateway";
import type { ProductCardVM } from "@/core/catalog/types";

export interface CartHydrationResult {
  /** Map productId → fresh `ProductCardVM`. Never throws; missing ids are absent. */
  byId: ReadonlyMap<string, ProductCardVM>;
  /** Convenience accessor — returns `undefined` while loading or when the row is missing. */
  lookup: (productId: string) => ProductCardVM | undefined;
  isLoading: boolean;
  isFetching: boolean;
  error: unknown;
  query: UseQueryResult<ProductCardVM[], unknown>;
}

const EMPTY_MAP: ReadonlyMap<string, ProductCardVM> = new Map();

const HYDRATION_STALE_MS = 60_000;
const HYDRATION_GC_MS = 5 * 60_000;

/**
 * Hydrate a list of cart-line product ids into fresh `ProductCardVM`s.
 *
 * @example
 *   const { byId, lookup, isLoading } = useCartHydration(productIds);
 *   const live = lookup(line.productId);
 *   const name = live?.name.ar ?? line.capturedName;
 */
export function useCartHydration(
  ids: readonly string[],
): CartHydrationResult {
  const sortedIds = [...new Set(ids)].sort();
  const key = sortedIds.join("|");
  const enabled = sortedIds.length > 0;

  const query = useQuery({
    queryKey: ["cart-hydration", key],
    queryFn: () => catalogGateway.getManyById(sortedIds),
    enabled,
    staleTime: HYDRATION_STALE_MS,
    gcTime: HYDRATION_GC_MS,
  });

  const byId = enabled
    ? new Map((query.data ?? []).map((p) => [p.id, p]))
    : EMPTY_MAP;

  const lookup = (productId: string): ProductCardVM | undefined =>
    byId.get(productId);

  return {
    byId,
    lookup,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    query,
  };
}
