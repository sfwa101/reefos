// TanStack Query layer over the products catalog.
// ----------------------------------------------------
// The legacy in-memory cache in `src/lib/products.ts` already handles
// realtime updates and synchronous reads for ~50 existing call sites.
// This hook adds Stale-While-Revalidate semantics + Suspense-friendly
// usage for new callers (loaders, route components) without disturbing
// the existing cache plumbing.
//
// Both layers share the same `fetchAllProducts` -> Supabase pipeline,
// so there is no double-fetch.

import { queryOptions, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  ensureProductsLoaded,
  PRODUCT_COLUMNS,
  rowToProduct,
  type DbRow,
  type Product,
  type ProductSource,
} from "@/lib/products";

const STALE_MS = 60_000; // 1 min — realtime channel handles live invalidation
const GC_MS = 5 * 60_000; // 5 min — keep cache for back-nav

export const productsQueryOptions = () =>
  queryOptions({
    queryKey: ["catalog", "products"] as const,
    queryFn: (): Promise<Product[]> => ensureProductsLoaded(),
    staleTime: STALE_MS,
    gcTime: GC_MS,
  });

/** SWR-cached full catalog. Falls back to static seed on network failure
 *  via the underlying `ensureProductsLoaded`. */
export function useProductsQuery() {
  return useQuery(productsQueryOptions());
}

/** SWR-cached subset filtered by storefront source. */
export function useProductsBySourceQuery(source: ProductSource) {
  return useQuery({
    ...productsQueryOptions(),
    select: (all) => all.filter((p) => p.source === source),
  });
}

/** SWR-cached single product lookup by id. */
export function useProductQuery(id: string | undefined) {
  return useQuery({
    ...productsQueryOptions(),
    enabled: Boolean(id),
    select: (all) => (id ? all.find((p) => p.id === id) : undefined),
  });
}

/* ── Phase 25.1 — Cold-start fast path ────────────────────────────────
 * Paginated fetch dedicated to the Home rails. Pulls only the top-N
 * active products ordered by sort_order — does NOT trigger the global
 * `ensureProductsLoaded()` monolith cache. ~24-48 rows is enough to
 * power 6 horizontal carousels on first paint.
 */
async function fetchHomeProducts(limit: number): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_COLUMNS)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .limit(limit);
  if (error) {
    console.error("[useHomeProductsQuery] fetch failed:", error);
    return [];
  }
  return ((data ?? []) as DbRow[]).map(rowToProduct);
}

export const homeProductsQueryOptions = (limit = 48) =>
  queryOptions({
    queryKey: ["catalog", "home-products", limit] as const,
    queryFn: () => fetchHomeProducts(limit),
    staleTime: STALE_MS,
    gcTime: GC_MS,
  });

/** SWR-cached limited slice of the catalog for the Home page rails.
 *  Avoids the full-catalog hydration block on cold-start. */
export function useHomeProductsQuery(limit = 48) {
  return useQuery(homeProductsQueryOptions(limit));
}
