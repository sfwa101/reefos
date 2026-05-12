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
  useInfiniteQuery,
  type InfiniteData,
  type UseInfiniteQueryResult,
} from "@tanstack/react-query";
import { useMemo } from "react";
import {
  type Product,
  type ProductSource,
} from "@/core/catalog/legacy/legacyProduct.types";
import { searchSovereignAssets, assetToProduct } from "@/lib/sovereignCatalog";
import { getActiveTenantId } from "@/context/TenantContext";

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

async function fetchCatalogPage(
  params: UseInfiniteCatalogParams,
  offset: number,
  limit: number,
): Promise<CatalogPage> {
  const rows = await searchSovereignAssets({
    q: params.q,
    sources: params.sources,
    subCategory: params.subCategory,
    offset,
    limit,
  });
  const items = rows
    .map(assetToProduct)
    .filter((p): p is Product => p != null);
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
    readonly [string, string, string, string, string, string, number],
    number
  >({
    // Phase 41/43 — tenant-scoped key prevents cross-tenant cache bleed.
    queryKey: [
      "tenant",
      getActiveTenantId(),
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
