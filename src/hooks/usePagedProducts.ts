/**
 * Server-driven, paginated catalog query.
 *
 * Replaces the legacy `ensureProductsLoaded()` + global in-memory cache
 * pattern with a Supabase `.range()`-backed `useInfiniteQuery`. All
 * filtering (search, vertical, sub-category) happens **on the server**
 * via Postgres `ilike` + indexes, so the browser never receives more
 * than the page it actually renders.
 *
 * Run the matching SQL migration to create the trigram index on
 * `(name, brand, sub_category)` for fast `ilike` queries.
 */
import { useInfiniteQuery, type InfiniteData } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Product, ProductSource } from "@/lib/products";

export const PAGE_SIZE = 50;

export type PagedProductsFilter = {
  source?: ProductSource;
  /** Multi-source whitelist (e.g. supermarket vertical spans many sources). */
  sources?: ReadonlyArray<ProductSource>;
  /** Sources to exclude (e.g. wholesale, kitchen, restaurants). */
  excludeSources?: ReadonlyArray<ProductSource>;
  subCategory?: string;
  /** Free-text search across name + brand + sub_category (server-side ilike). */
  q?: string;
};

type DbRow = {
  id: string;
  name: string;
  brand: string | null;
  unit: string;
  price: number;
  old_price: number | null;
  image: string | null;
  image_url: string | null;
  rating: number | null;
  category: string;
  sub_category: string | null;
  source: string;
  badge: string | null;
  variants: unknown;
  addons: unknown;
  perishable: boolean | null;
  metadata: unknown;
  description: string | null;
};

const FALLBACK_IMG =
  "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23f3f4f6'/%3E%3C/svg%3E";

const rowToProduct = (row: DbRow): Product => ({
  id: row.id,
  name: row.name,
  brand: row.brand ?? undefined,
  unit: row.unit,
  price: Number(row.price),
  oldPrice: row.old_price != null ? Number(row.old_price) : undefined,
  image: row.image_url || row.image || FALLBACK_IMG,
  rating: row.rating != null ? Number(row.rating) : undefined,
  category: row.category,
  subCategory: row.sub_category ?? undefined,
  source: (row.source as ProductSource) ?? "supermarket",
  badge: (row.badge as Product["badge"]) ?? undefined,
  variants: (row.variants as Product["variants"]) ?? undefined,
  addons: (row.addons as Product["addons"]) ?? undefined,
  perishable: row.perishable ?? undefined,
  metadata:
    row.metadata && typeof row.metadata === "object"
      ? (row.metadata as Record<string, unknown>)
      : undefined,
  description: row.description ?? undefined,
});

export type PageResult = {
  items: Product[];
  nextCursor: number | null;
};

const SELECT_COLS =
  "id,name,brand,unit,price,old_price,image,image_url,rating,category,sub_category,source,badge,variants,addons,perishable,metadata,description";

export async function fetchProductsPage(
  filter: PagedProductsFilter,
  cursor: number,
): Promise<PageResult> {
  const from = cursor;
  const to = cursor + PAGE_SIZE - 1;

  let q = supabase
    .from("products")
    .select(SELECT_COLS)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .range(from, to);

  if (filter.source) q = q.eq("source", filter.source);
  if (filter.sources && filter.sources.length > 0) q = q.in("source", filter.sources as string[]);
  if (filter.excludeSources && filter.excludeSources.length > 0) {
    const list = filter.excludeSources.map((s) => `"${s}"`).join(",");
    q = q.not("source", "in", `(${list})`);
  }
  if (filter.subCategory) q = q.eq("sub_category", filter.subCategory);
  if (filter.q && filter.q.trim()) {
    const term = `%${filter.q.trim()}%`;
    // Server-side OR ilike across the searchable columns.
    q = q.or(`name.ilike.${term},brand.ilike.${term},sub_category.ilike.${term}`);
  }

  const { data, error } = await q;
  if (error) {
    console.error("[catalog] page fetch failed:", error);
    return { items: [], nextCursor: null };
  }
  const rows = (data ?? []) as DbRow[];
  const items = rows.map(rowToProduct);
  const nextCursor = items.length === PAGE_SIZE ? cursor + PAGE_SIZE : null;
  return { items, nextCursor };
}

export const pagedProductsKey = (f: PagedProductsFilter) =>
  [
    "catalog",
    "paged",
    f.source ?? null,
    f.sources ? [...f.sources].sort().join(",") : null,
    f.excludeSources ? [...f.excludeSources].sort().join(",") : null,
    f.subCategory ?? null,
    f.q?.trim() || null,
  ] as const;

export function usePagedProducts(filter: PagedProductsFilter) {
  return useInfiniteQuery<
    PageResult,
    Error,
    InfiniteData<PageResult>,
    ReturnType<typeof pagedProductsKey>,
    number
  >({
    queryKey: pagedProductsKey(filter),
    queryFn: ({ pageParam }) => fetchProductsPage(filter, pageParam),
    initialPageParam: 0,
    getNextPageParam: (last) => last.nextCursor,
    staleTime: 5 * 60_000, // offline-first: serve cached for 5 min, revalidate in bg
    gcTime: 24 * 60 * 60_000, // keep on disk for 24h via persister
  });
}
