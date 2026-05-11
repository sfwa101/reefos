/**
 * useHomeOrchestrator — single source of truth for the Home Goods
 * storefront page state.
 *
 * Phase 11.2 — products are now fetched from Supabase via
 * `useProductsBySourceQuery("home")` and projected to the legacy
 * `HGProduct` view-model via `productToHGView`. There is no longer
 * any local product data.
 *
 * Owns:
 *   - search query, active category, fulfillment filter, sort, price cap
 *   - bottom-sheet (filters) + product detail overlay open state
 *   - derived: filtered list, best sellers, opened product, filtersActive flag
 *   - loading flag for skeleton states
 */
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { catalogGateway } from "@/core/catalog/gateway";
import type { ProductCardVM } from "@/core/catalog/types";
import type { Product, ProductSource } from "@/lib/products";

import { useSectionSubcategories, type SubcategoryItem } from "@/core/catalog/hooks/useSectionSubcategories";

import { BESTSELLER_IDS } from "../dictionaries";

// Wave 2.E — wire orchestrator to the runtime catalog gateway (usa_products
// via CatalogService) instead of the legacy salsabil_assets path. Source
// names map 1:1 to section slugs except for these aliases.
const SOURCE_TO_SLUG: Partial<Record<ProductSource, string>> = {
  home: "home-goods",
  library: "school-library",
};

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
import { productToHGView } from "../mapper";
import type {
  CatId,
  FulfillmentFilter,
  HGProduct,
  SortId,
} from "../types";

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

  // ─── derived ───
  /** Full live catalog (DB-driven, view-model). */
  catalog: HGProduct[];
  /** Live `Product` rows — used by Add-To-Cart paths. */
  rawProducts: Product[];
  filtered: HGProduct[];
  bestSellers: HGProduct[];
  opened: HGProduct | null;
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

export const useHomeOrchestrator = (source: ProductSource = "home"): HomeOrchestrator => {
  const slug = SOURCE_TO_SLUG[source] ?? source;
  const { data: rawProducts = [], isLoading } = useQuery({
    queryKey: ["catalog", "section", slug, 48],
    queryFn: async (): Promise<Product[]> => {
      const r = await catalogGateway.listSection({ slug, limit: 48, sort: "popularity" });
      if (!r.items.length) {
        console.warn("[CatalogGateway] Section returned 0 products for slug:", slug);
      }
      return r.items.map((vm) => vmToProduct(vm, source));
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
  });

  const catalog = useMemo(
    () => rawProducts.map(productToHGView),
    [rawProducts],
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
    () => (catalog.length ? Math.max(...catalog.map((p) => p.price)) : 50000),
    [catalog],
  );
  const [priceMax, setPriceMaxRaw] = useState<number | null>(null);
  // Auto-track the dynamic max while the user hasn't customised it.
  const effectivePriceMax = priceMax ?? priceMaxAvail;
  const setPriceMax = (n: number) => setPriceMaxRaw(n);

  const filtered = useMemo(() => {
    const term = q.trim();
    let list = catalog.filter((p) => {
      if (cat !== "all") {
        if (dynamicCats) {
          // DB-driven: match against the raw `tags` array.
          if (!p.tags || !p.tags.includes(cat)) return false;
        } else if (p.category !== cat) {
          return false;
        }
      }
      if (fulFilter !== "all" && p.fulfillment !== fulFilter) return false;
      if (p.price > effectivePriceMax) return false;
      if (!term) return true;
      return (
        p.name.includes(term) ||
        p.brand.includes(term) ||
        p.tagline.includes(term)
      );
    });
    switch (sort) {
      case "price-asc":
        list = [...list].sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        list = [...list].sort((a, b) => b.price - a.price);
        break;
      case "rating":
        list = [...list].sort((a, b) => b.rating - a.rating);
        break;
      case "discount":
        list = [...list].sort((a, b) => {
          const da = a.oldPrice ? (a.oldPrice - a.price) / a.oldPrice : 0;
          const db = b.oldPrice ? (b.oldPrice - b.price) / b.oldPrice : 0;
          return db - da;
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
