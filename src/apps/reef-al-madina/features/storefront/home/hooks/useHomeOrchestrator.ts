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

import { useProductsBySourceQuery } from "@/hooks/useProductsQuery";
import type { Product } from "@/lib/products";

import { BESTSELLER_IDS } from "../dictionaries";
import { productToHGView } from "../mapper";
import type {
  CatId,
  FulfillmentFilter,
  HGProduct,
  SortId,
} from "../types";

export type HomeOrchestrator = {
  // ─── primitive state ───
  cat: CatId;
  setCat: (c: CatId) => void;
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

  // ─── compound actions ───
  resetAll: () => void;
  resetFilters: () => void;
};

export const useHomeOrchestrator = (): HomeOrchestrator => {
  const { data: rawProducts = [], isLoading, error, isFetching, status, fetchStatus } =
    useProductsBySourceQuery("home");

  // [Phase 23.3] Deadlock telemetry — surfaces stuck Suspense / hung query.
  console.debug("[Home Diagnostics] HomeOrchestrator", {
    isLoading,
    isFetching,
    status,
    fetchStatus,
    rows: rawProducts.length,
    error: error ? String((error as Error).message ?? error) : null,
  });

  const catalog = useMemo(
    () => rawProducts.map(productToHGView),
    [rawProducts],
  );

  const [cat, setCat] = useState<CatId>("all");
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
      if (cat !== "all" && p.category !== cat) return false;
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
  }, [catalog, cat, q, sort, fulFilter, effectivePriceMax]);

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
    resetAll,
    resetFilters,
  };
};
