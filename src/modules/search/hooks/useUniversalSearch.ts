/**
 * useUniversalSearch — federated, in-memory search with MiniSearch.
 *
 * Indexes products + restaurants from the existing in-memory caches.
 * Returns ranked hits and exposes `searchByBarcode` for instant lookup.
 */
import { useDeferredValue, useEffect, useMemo, useRef } from "react";
import MiniSearch, { type SearchResult } from "minisearch";
import { useProducts, type Product } from "@/lib/products";
import { restaurants, type Restaurant } from "@/lib/restaurants";
import type { SearchableEntity, SearchHit } from "../types";

/** Map a product → searchable entity. */
function toProductEntity(p: Product): SearchableEntity {
  const barcode =
    p.metadata && typeof p.metadata === "object"
      ? (p.metadata as Record<string, unknown>).barcode
      : undefined;
  return {
    id: `product:${p.id}`,
    kind: "product",
    rawId: p.id,
    title: p.name,
    subtitle: p.brand ?? p.unit,
    category: p.category,
    keywords: [p.subCategory, p.brand, p.source].filter(Boolean).join(" "),
    image: p.image,
    barcode: typeof barcode === "string" ? barcode : undefined,
    href: `/product/${p.id}`,
  };
}

function toRestaurantEntity(r: Restaurant): SearchableEntity {
  return {
    id: `restaurant:${r.id}`,
    kind: "restaurant",
    rawId: r.id,
    title: r.name,
    subtitle: r.tagline,
    category: "مطاعم",
    keywords: r.tagline,
    href: `/restaurant/${r.id}`,
  };
}

const MINI_OPTIONS = {
  fields: ["title", "subtitle", "category", "keywords"] as const,
  storeFields: [
    "id", "kind", "rawId", "title", "subtitle", "category",
    "image", "barcode", "href",
  ] as const,
  searchOptions: {
    boost: { title: 3, subtitle: 1.5, category: 1.2 },
    prefix: true,
    fuzzy: 0.2,
  },
} as const;

export interface UseUniversalSearchResult {
  readonly hits: readonly SearchHit[];
  readonly loading: boolean;
  readonly total: number;
  readonly searchByBarcode: (code: string) => SearchableEntity | undefined;
  readonly entityCount: number;
}

export function useUniversalSearch(query: string): UseUniversalSearchResult {
  const { products, loading } = useProducts();
  const deferredQuery = useDeferredValue(query);

  const entities = useMemo<SearchableEntity[]>(() => {
    const list: SearchableEntity[] = [];
    for (const p of products) list.push(toProductEntity(p));
    for (const r of restaurants) list.push(toRestaurantEntity(r));
    return list;
  }, [products]);

  const indexRef = useRef<MiniSearch<SearchableEntity> | null>(null);
  const barcodeMapRef = useRef<Map<string, SearchableEntity>>(new Map());

  useEffect(() => {
    const mini = new MiniSearch<SearchableEntity>({
      fields: [...MINI_OPTIONS.fields],
      storeFields: [...MINI_OPTIONS.storeFields],
      searchOptions: { ...MINI_OPTIONS.searchOptions },
    });
    mini.addAll(entities);
    indexRef.current = mini;

    const map = new Map<string, SearchableEntity>();
    for (const e of entities) {
      if (e.barcode) map.set(e.barcode, e);
    }
    barcodeMapRef.current = map;
  }, [entities]);

  const hits = useMemo<readonly SearchHit[]>(() => {
    const term = deferredQuery.trim();
    const mini = indexRef.current;
    if (!term || term.length < 2 || !mini) return [];
    const results = mini.search(term, MINI_OPTIONS.searchOptions) as SearchResult[];
    return results.slice(0, 60).map((r) => ({
      id: String(r.id),
      kind: r.kind as SearchableEntity["kind"],
      rawId: String(r.rawId),
      title: String(r.title),
      subtitle: r.subtitle ? String(r.subtitle) : undefined,
      category: r.category ? String(r.category) : undefined,
      image: r.image ? String(r.image) : undefined,
      barcode: r.barcode ? String(r.barcode) : undefined,
      href: String(r.href),
      score: typeof r.score === "number" ? r.score : 0,
    }));
  }, [deferredQuery]);

  const searchByBarcode = useMemo(
    () => (code: string) => barcodeMapRef.current.get(code.trim()),
    [],
  );

  return {
    hits,
    loading,
    total: hits.length,
    searchByBarcode,
    entityCount: entities.length,
  };
}
