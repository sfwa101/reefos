/**
 * useUniversalSearch — federated search powered by the SERVER catalog.
 *
 * Phase 25.3: switched off the legacy in-memory `useProducts()` cache.
 * Products are fetched from Supabase via `useInfiniteCatalog` with the
 * user's query pushed down as an `.ilike` filter. We then re-rank the
 * (already filtered) server slice with MiniSearch so Arabic
 * normalization, alias expansion, and prefix/fuzzy scoring still apply
 * to the visible result set.
 */
import { useDeferredValue, useEffect, useMemo, useRef } from "react";
import MiniSearch, { type SearchResult } from "minisearch";
import { type Product } from "@/core/catalog/legacy/legacyProduct.types";
import { useInfiniteCatalog } from "@/hooks/useInfiniteCatalog";
import { restaurants, type Restaurant } from "@/lib/restaurants";
import { normalizeArabic, expandKeywords } from "@/core/search/utils/arabicLogic";
import type { SearchableEntity, SearchHit } from "../types";

function extractAliases(metadata: unknown): readonly string[] {
  if (!metadata || typeof metadata !== "object") return [];
  const a = (metadata as Record<string, unknown>).aliases;
  if (Array.isArray(a)) return a.filter((x): x is string => typeof x === "string");
  if (typeof a === "string") return a.split(",").map((s) => s.trim()).filter(Boolean);
  return [];
}

function toProductEntity(p: Product): SearchableEntity {
  const barcode =
    p.metadata && typeof p.metadata === "object"
      ? (p.metadata as Record<string, unknown>).barcode
      : undefined;
  const aliases = extractAliases(p.metadata);
  const baseExtras = [p.subCategory, p.brand, p.source, ...aliases].filter(
    (x): x is string => typeof x === "string" && x.length > 0,
  );
  return {
    id: `product:${p.id}`,
    kind: "product",
    rawId: p.id,
    title: normalizeArabic(p.name),
    subtitle: normalizeArabic(p.brand ?? p.unit ?? ""),
    category: normalizeArabic(p.category),
    keywords: expandKeywords(p.name, baseExtras),
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
    title: normalizeArabic(r.name),
    subtitle: normalizeArabic(r.tagline ?? ""),
    category: normalizeArabic("مطاعم"),
    keywords: expandKeywords(r.name, [r.tagline].filter((x): x is string => !!x)),
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
    fuzzy: 0.25,
  },
} as const;

export interface UseUniversalSearchResult {
  readonly hits: readonly SearchHit[];
  readonly loading: boolean;
  readonly total: number;
  readonly searchByBarcode: (code: string) => SearchableEntity | undefined;
  readonly entityCount: number;
  /** Raw server-fetched products — exposed so callers can render full
   *  product cards without re-fetching. */
  readonly products: readonly Product[];
}

export function useUniversalSearch(query: string): UseUniversalSearchResult {
  const deferredQuery = useDeferredValue(query);
  const term = normalizeArabic(deferredQuery).trim();

  // Push the query down to Postgres. When the term is empty, we still
  // pass an empty string so the hook is mounted but returns no rows
  // (cache key changes, no waterfall).
  const { products, isLoading } = useInfiniteCatalog({
    sources: [],
    q: term.length >= 2 ? deferredQuery : "",
    limit: 50,
  });

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
  }, [deferredQuery, entities, term]);

  const searchByBarcode = useMemo(
    () => (code: string) => barcodeMapRef.current.get(code.trim()),
    [],
  );

  return {
    hits,
    loading: isLoading,
    total: hits.length,
    searchByBarcode,
    entityCount: entities.length,
    products,
  };
}
