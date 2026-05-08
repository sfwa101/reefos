// useInfiniteCatalog — paginated, server-filtered product feed.
// ----------------------------------------------------------------
// Phase 22.0 — Replaces the legacy in-memory `cache: Product[]` monolith.
// Each call-site declares the slice of the catalog it cares about
// (sources, optional sub_category, optional search term) and pages
// through the result set 50 rows at a time using Supabase `.range()`.
//
// • Search is pushed to the server: `name.ilike.%q%,brand.ilike.%q%`.
// • Pages are flattened into a single `products` array for ergonomic
//   consumption by grids.
// • Realtime invalidation is intentionally NOT wired here — it caused
//   full-catalog refetches in the legacy layer. Add per-screen
//   subscriptions where needed.

import {
// Phase 15.1 — products/categories tables dropped; legacy admin/POS callsites use a typed-erased alias.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const __sb: any = supabase;
  useInfiniteQuery,
  type InfiniteData,
  type UseInfiniteQueryResult,
} from "@tanstack/react-query";
import { useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  PRODUCT_COLUMNS,
  rowToProduct,
  type DbRow,
  type Product,
  type ProductSource,
} from "@/lib/products";

export interface UseInfiniteCatalogParams {
  readonly sources: ReadonlyArray<ProductSource>;
  readonly subCategory?: string;
  readonly q?: string;
  readonly limit?: number;
}

export interface CatalogPage {
  readonly items: ReadonlyArray<Product>;
  readonly nextOffset: number | null;
}

const DEFAULT_LIMIT = 50;

/** Escape PostgREST `%` and `,` so search input can't break the `or` filter. */
const escapeIlike = (raw: string): string =>
  raw.replace(/[%,()]/g, (m) => `\\${m}`);

async function fetchCatalogPage(
  params: UseInfiniteCatalogParams,
  offset: number,
  limit: number,
): Promise<CatalogPage> {
  let query = __sb
    .from("products")
    .select(PRODUCT_COLUMNS)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .range(offset, offset + limit - 1);

  if (params.sources.length > 0) {
    query = query.in("source", params.sources as unknown as string[]);
  }
  if (params.subCategory) {
    query = query.eq("sub_category", params.subCategory);
  }
  const term = params.q?.trim();
  if (term) {
    const safe = escapeIlike(term);
    query = query.or(`name.ilike.%${safe}%,brand.ilike.%${safe}%`);
  }

  const { data, error } = await query;
  if (error) throw error;

  const rows = (data ?? []) as DbRow[];
  const items = rows.map(rowToProduct);
  return {
    items,
    nextOffset: items.length < limit ? null : offset + limit,
  };
}

export interface UseInfiniteCatalogResult {
  readonly products: ReadonlyArray<Product>;
  readonly isLoading: boolean;
  readonly isError: boolean;
  readonly error: unknown;
  readonly hasNextPage: boolean;
  readonly isFetchingNextPage: boolean;
  readonly fetchNextPage: () => void;
  readonly refetch: () => void;
  readonly query: UseInfiniteQueryResult<InfiniteData<CatalogPage, number>, Error>;
}

export function useInfiniteCatalog(
  params: UseInfiniteCatalogParams,
): UseInfiniteCatalogResult {
  const limit = params.limit ?? DEFAULT_LIMIT;
  const sourcesKey = useMemo(
    () => [...params.sources].sort().join(","),
    [params.sources],
  );

  const query = useInfiniteQuery<
    CatalogPage,
    Error,
    InfiniteData<CatalogPage, number>,
    readonly [string, string, string, string, number],
    number
  >({
    queryKey: [
      "catalog",
      sourcesKey,
      params.subCategory ?? "",
      params.q?.trim() ?? "",
      limit,
    ] as const,
    initialPageParam: 0,
    queryFn: ({ pageParam }) => fetchCatalogPage(params, pageParam, limit),
    getNextPageParam: (last) => last.nextOffset,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });

  const products = useMemo<ReadonlyArray<Product>>(
    () => query.data?.pages.flatMap((p) => p.items) ?? [],
    [query.data],
  );

  return {
    products,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    hasNextPage: query.hasNextPage ?? false,
    isFetchingNextPage: query.isFetchingNextPage,
    fetchNextPage: () => {
      void query.fetchNextPage();
    },
    refetch: () => {
      void query.refetch();
    },
    query,
  };
}
