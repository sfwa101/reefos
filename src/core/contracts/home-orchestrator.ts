/**
 * Home Orchestrator port — Constitution v5.1 Article 2 (Kernel Purity).
 *
 * This is the structural contract that the storefront app's
 * `useHomeOrchestrator` hook fulfils. Defining it here lets the kernel
 * reference an orchestrator instance (e.g. `ResolveRenderTree`) without
 * importing app code. The app-side hook implements this exact shape and
 * re-exports `HomeOrchestrator` for backward compat.
 */
import type { ProductCardVM } from "@/core/catalog/types";
import type { Product } from "@/core/catalog/legacyProduct.types";
import type { SubcategoryItem } from "@/core/catalog/hooks/useSectionSubcategories";

export type SortId =
  | "relevance"
  | "price-asc"
  | "price-desc"
  | "rating"
  | "discount";

export type FulfillmentFilter = "all" | "instant" | "preorder";

export type HomeOrchestrator = {
  // primitive state
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

  // derived
  catalog: ProductCardVM[];
  rawProducts: Product[];
  filtered: ProductCardVM[];
  bestSellers: ProductCardVM[];
  opened: ProductCardVM | null;
  openedRaw: Product | null;
  filtersActive: boolean;
  loading: boolean;
  dynamicCats?: SubcategoryItem[];

  // compound actions
  resetAll: () => void;
  resetFilters: () => void;
};
