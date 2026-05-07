// TanStack Query layer over the products catalog.
// ----------------------------------------------------
// Phase 26.2 — This is the SOLE source of truth for the catalog.
// `src/lib/products.ts` no longer holds its own cache; it reads
// from the Query cache via `bindCatalogSource()`.

import { queryOptions, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  PRODUCT_COLUMNS,
  PRODUCTS_QUERY_KEY,
  rowToProduct,
  type DbRow,
  type Product,
  type ProductSource,
} from "@/lib/products";

const STALE_MS = 60_000; // 1 min — realtime channel handles live invalidation
const GC_MS = 5 * 60_000; // 5 min — keep cache for back-nav
const isBrowser = typeof window !== "undefined";

async function fetchAllProducts(): Promise<Product[]> {
  if (!isBrowser) return [];
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_COLUMNS)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .limit(2000);
  if (error) {
    console.error("[products] fetch failed:", error);
    return [];
  }
  return ((data ?? []) as DbRow[]).map(rowToProduct);
}

export const productsQueryOptions = () =>
  queryOptions({
    queryKey: PRODUCTS_QUERY_KEY,
    queryFn: fetchAllProducts,
    staleTime: STALE_MS,
    gcTime: GC_MS,
  });

/** SWR-cached full catalog. */
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

/* ── Phase 25.1 / 4.2 — Cold-start fast path (source-aware, capped) ── */
async function fetchHomeProducts(
  limit: number,
  source?: ProductSource,
): Promise<Product[]> {
  let q = supabase
    .from("products")
    .select(PRODUCT_COLUMNS)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .limit(limit);
  if (source) q = q.eq("source", source);
  const { data, error } = await q;
  if (error) {
    console.error("[useHomeProductsQuery] fetch failed:", error);
    return [];
  }
  return ((data ?? []) as DbRow[]).map(rowToProduct);
}

export const homeProductsQueryOptions = (limit = 48, source?: ProductSource) =>
  queryOptions({
    queryKey: ["catalog", "home-products", source ?? "all", limit] as const,
    queryFn: () => fetchHomeProducts(limit, source),
    staleTime: STALE_MS,
    gcTime: GC_MS,
  });

export function useHomeProductsQuery(limit = 48, source?: ProductSource) {
  return useQuery(homeProductsQueryOptions(limit, source));
}
