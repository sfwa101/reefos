/**
 * StoreCategoryGrid — Phase 25 reusable category surface.
 *
 * A thin, dependency-light grid that filters the in-memory product
 * catalog by `ProductSource` and renders the canonical `<ProductCard>`.
 *
 * This is the storefront's primitive for future "dead-stub revival"
 * work — every new category route can mount this with one line, instead
 * of forking the heavyweight `SinglePageStore` shell.
 *
 * Routes already using `SinglePageStore` / `DualNavStore` were left
 * intact — they are functional, not stubs. This component is the
 * canonical building block for new categories from here on.
 */
import { useMemo } from "react";
import ProductCard from "@/components/ProductCard";
import { bySource } from "@/core/catalog/runtime/legacyRuntime";
import type { ProductSource } from "@/core/catalog/legacyProduct.types";

interface StoreCategoryGridProps {
  /** The product source to filter by. */
  category: ProductSource;
  /** Optional sub-category (matches `subCategory` field). */
  subCategory?: string;
  /** Empty-state copy. */
  emptyText?: string;
  /** Limit the number of products rendered (e.g. for "featured" rails). */
  limit?: number;
}

const StoreCategoryGrid = ({
  category,
  subCategory,
  emptyText = "لا توجد منتجات في هذا القسم حالياً.",
  limit,
}: StoreCategoryGridProps) => {
  // Re-render when the catalog cache mutates (realtime channel).

  const items = useMemo(() => {
    let list = bySource(category);
    if (subCategory) list = list.filter((p) => p.subCategory === subCategory);
    return typeof limit === "number" ? list.slice(0, limit) : list;
  }, [category, subCategory, limit]);

  if (items.length === 0) {
    return (
      <div className="rounded-3xl border border-border/40 bg-card p-8 text-center shadow-sm">
        <p className="text-[13px] text-muted-foreground">{emptyText}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
};

export default StoreCategoryGrid;
