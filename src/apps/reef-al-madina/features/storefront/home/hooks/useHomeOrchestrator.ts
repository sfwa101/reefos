/**
 * useHomeOrchestrator — single source of truth for the storefront page state.
 *
 * Wave P-A (Storefront Purity) — the legacy view-model has been eradicated. The
 * orchestrator now consumes `ProductCardVM[]` directly from
 * `catalogGateway.listSection` (the canonical sovereign catalog) and emits
 * the same shape to all leaf components. The `homeProductCardAdapter`
 * derives the legacy filter axes (`CatId`, `Fulfillment`) and presentation
 * fields from the VM without polluting it.
 *
 * `rawProducts` / `openedRaw` are kept as a *transitional* legacy bridge
 * exclusively for the few outside consumers (`PersonalizedDealsRail`,
 * `QuickMealsRail`) that still expect the legacy `Product` shape. They are
 * derived locally via `vmToProduct` and will disappear once those rails are
 * migrated to consume `ProductCardVM[]` directly.
 *
 * Owns:
 *   - search query, active category, fulfillment filter, sort, price cap
 *   - bottom-sheet (filters) + product detail overlay open state
 *   - derived: filtered list, best sellers, opened product, filtersActive flag
 *   - loading flag for skeleton states
 */
import { useMemo, useState } from "react";
import { queryOptions, useQuery } from "@tanstack/react-query";

import { catalogGateway } from "@/core/catalog/gateway";
import type { ProductCardVM } from "@/core/catalog/types";
import type { Product, ProductSource } from "@/core/catalog/legacyProduct.types";

import { useSectionSubcategories, type SubcategoryItem } from "@/core/catalog/hooks/useSectionSubcategories";

import { BESTSELLER_IDS } from "../dictionaries";
import { homeProductCardAdapter } from "../adapter";
import type { FulfillmentFilter, SortId } from "../types";
import { Tracer } from "@/core/system/observability/Tracer";

// Wave 2.E — section slugs for sources that don't equal the source name.
const SOURCE_TO_SLUG: Partial<Record<ProductSource, string>> = {
  home: "home-goods",
  library: "school-library",
};

/**
 * Transitional legacy bridge — converts a sovereign `ProductCardVM` back
 * into the legacy `Product` shape consumed by `PersonalizedDealsRail` and
 * `QuickMealsRail`. Will be deleted once those rails migrate to VM.
 */
const vmToProduct = (vm: ProductCardVM, source: ProductSource): Product => {
  const attrs = (vm.attributes ?? {}) as Record<string, unknown>;
  const brand = typeof attrs.brand === "string" ? attrs.brand : undefined;
  const badge = (typeof attrs.badge === "string" ? attrs.badge : undefined) as Product["badge"];
  return {
    id: vm.id,
    name: vm.name.ar,
    brand,
    unit: vm.saleUnit,
    price: vm.price.amount,
    oldPrice: vm.price.compareAt,
    image: vm.hero?.url ?? "",
    rating: vm.rating?.avg,
    category: vm.sectionSlug,
    subCategory: typeof attrs.sub_category === "string" ? attrs.sub_category : undefined,
    source,
    badge,
    perishable: typeof attrs.perishable === "boolean" ? attrs.perishable : undefined,
    metadata: { ...attrs, vm_capabilities: vm.capabilities, tags: vm.tags },
    description: vm.shortDescription?.ar,
  };
};

export type HomeOrchestrator = {
  // ─── primitive state ───
  cat: string;
  setCat: (c: string) => void;
  q: string;
  setQ: (q: string) => void;
  openId: string | null;
  setOpenId: (id: string | null) => void;
  sort: SortId;
  setSort: (s: SortId) => void;
  fulFilter: FulfillmentFilter;
  setFulFilter: (f: FulfillmentFilter) => void;
  filtersOpen: boolean;
  setFiltersOpen: (b: boolean) => void;
  priceMax: number;
  setPriceMax: (n: number) => void;
  priceMaxAvail: number;

  // ─── derived (canonical sovereign view-models) ───
  /** Full live catalog (DB-driven, canonical view-model). */
  catalog: ProductCardVM[];
  /** Legacy `Product` rows — transitional, only for un-migrated rails. */
  rawProducts: Product[];
  filtered: ProductCardVM[];
  bestSellers: ProductCardVM[];
  opened: ProductCardVM | null;
  /** Legacy opened — transitional, only for un-migrated callers. */
  openedRaw: Product | null;
  filtersActive: boolean;
  loading: boolean;
  /**
   * DB-derived subcategory pills for non-Home sections. `undefined` for
   * the Home Goods page so it keeps using the hardcoded `CATS` list.
   */
  dynamicCats?: SubcategoryItem[];

  // ─── compound actions ───
  resetAll: () => void;
  resetFilters: () => void;
};

/**
 * Wave P-D (One Artery) — single canonical cache key for the home section.
 * Both the route loader (`/_app/`) and `useHomeOrchestrator` consume this
 * exact `queryOptions`, so there is exactly ONE network read of
 * `salsabil_assets` per home visit. Other consumers can derive their shape
 * via `select` against the same key — never a parallel duplicate fetch.
 */
export const homeSectionQueryOptions = (
  source: ProductSource = "home",
  limit = 48,
) => {
  const slug = SOURCE_TO_SLUG[source] ?? source;
  return queryOptions({
    queryKey: ["catalog", "section", slug, limit, "vm"] as const,
    queryFn: async (): Promise<ProductCardVM[]> => {
      const r = await catalogGateway.listSection({ slug, limit, sort: "popularity" });
      if (!r.items.length) {
        Tracer.warn("storefront", "cataloggateway_section_returned_0_products_for_slug", { args: ["[CatalogGateway] Section returned 0 products for slug:", slug] });
      }
      return r.items;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
  });
};

export const useHomeOrchestrator = (source: ProductSource = "home"): HomeOrchestrator => {
  const slug = SOURCE_TO_SLUG[source] ?? source;
  const { data: catalog = [], isLoading } = useQuery(homeSectionQueryOptions(source));


  const rawProducts = useMemo(
    () => catalog.map((vm) => vmToProduct(vm, source)),
    [catalog, source],
  );

  // Home Goods keeps the curated hardcoded `CATS` list. Every other
  // section derives subcategory pills live from the DB (tags).
  const { data: subCats = [] } = useSectionSubcategories(
    source === "home" ? undefined : slug,
  );
  const dynamicCats = source === "home" ? undefined : subCats;

  const [cat, setCat] = useState<string>("all");
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [sort, setSort] = useState<SortId>("relevance");
  const [fulFilter, setFulFilter] = useState<FulfillmentFilter>("all");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const priceMaxAvail = useMemo(
    () => (catalog.length ? Math.max(...catalog.map((p) => p.price.amount)) : 50000),
    [catalog],
  );
  const [priceMax, setPriceMaxRaw] = useState<number | null>(null);
  const effectivePriceMax = priceMax ?? priceMaxAvail;
  const setPriceMax = (n: number) => setPriceMaxRaw(n);

  const filtered = useMemo(() => {
    const term = q.trim();
    let list = catalog.filter((p) => {
      const view = homeProductCardAdapter(p);
      if (cat !== "all") {
        if (dynamicCats) {
          // DB-driven: match against the raw `tags` array.
          if (!p.tags || !p.tags.includes(cat)) return false;
        } else if (view.catId !== cat) {
          return false;
        }
      }
      if (fulFilter !== "all" && view.fulfillment !== fulFilter) return false;
      if (p.price.amount > effectivePriceMax) return false;
      if (!term) return true;
      return (
        p.name.ar.includes(term) ||
        view.brand.includes(term) ||
        view.tagline.includes(term)
      );
    });
    switch (sort) {
      case "price-asc":
        list = [...list].sort((a, b) => a.price.amount - b.price.amount);
        break;
      case "price-desc":
        list = [...list].sort((a, b) => b.price.amount - a.price.amount);
        break;
      case "rating":
        list = [...list].sort((a, b) => (b.rating?.avg ?? 0) - (a.rating?.avg ?? 0));
        break;
      case "discount":
        list = [...list].sort((a, b) => {
          const ra = a.price.compareAt ? (a.price.compareAt - a.price.amount) / a.price.compareAt : 0;
          const rb = b.price.compareAt ? (b.price.compareAt - b.price.amount) / b.price.compareAt : 0;
          return rb - ra;
        });
        break;
      default:
        break;
    }
    return list;
  }, [catalog, cat, q, sort, fulFilter, effectivePriceMax, dynamicCats]);

  const bestSellers = useMemo(
    () => catalog.filter((p) => BESTSELLER_IDS.includes(p.id)),
    [catalog],
  );

  const opened = openId ? catalog.find((p) => p.id === openId) ?? null : null;
  const openedRaw = openId
    ? rawProducts.find((p) => p.id === openId) ?? null
    : null;

  const filtersActive =
    fulFilter !== "all" ||
    effectivePriceMax < priceMaxAvail ||
    sort !== "relevance";

  const resetFilters = () => {
    setFulFilter("all");
    setPriceMaxRaw(null);
    setSort("relevance");
  };

  const resetAll = () => {
    setQ("");
    setFulFilter("all");
    setPriceMaxRaw(null);
    setSort("relevance");
    setCat("all");
  };

  return {
    cat,
    setCat,
    q,
    setQ,
    openId,
    setOpenId,
    sort,
    setSort,
    fulFilter,
    setFulFilter,
    filtersOpen,
    setFiltersOpen,
    priceMax: effectivePriceMax,
    setPriceMax,
    priceMaxAvail,
    catalog,
    rawProducts,
    filtered,
    bestSellers,
    opened,
    openedRaw,
    filtersActive,
    loading: isLoading,
    dynamicCats,
    resetAll,
    resetFilters,
  };
};
