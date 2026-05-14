// SchoolLibrary hub — UI palette + live products feed.
// ----------------------------------------------------------------
// Wave P-B Step B-5 — Hooks & Queries: replaced the static
// `products.filter(p => p.source === "library")` snapshot read of
// `@/lib/products` with a TanStack-Query backed hook that wraps the
// existing `useProductsBySourceQuery("library")`. The legacy synchronous
// `libraryProducts()` helper is removed; the only consumer
// (`SchoolLibrarySection`) now consumes the hook directly.
//
// The royal-blue palette stays here unchanged — it is UI configuration,
// not catalog data.

import { useProductsBySourceQuery } from "@/hooks/useProductsQuery";
import type { Product } from "@/core/catalog/legacyProduct.types";

// Royal blue palette specific to this hub
export const PALETTE = {
  primary: "#1B5E8C",
  primarySoft: "#E6F1FA",
  ink: "#0F3A5C",
  accent: "#2EA8E6",
} as const;

/**
 * Live SchoolLibrary catalog feed. Wraps `useProductsBySourceQuery`,
 * which itself routes through the Sovereign Catalog SWR cache. The
 * shape stays Product-compatible during the transition; downstream UI
 * will migrate to `ProductCardVM` in a later sub-wave.
 */
export const useLibraryProducts = (): Product[] => {
  const { data = [] } = useProductsBySourceQuery("library");
  return data;
};

export type TabKey = "store" | "borrow" | "print";
