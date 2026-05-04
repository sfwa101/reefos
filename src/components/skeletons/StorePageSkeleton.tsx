/**
 * StorePageSkeleton — Phase 3 / SEV-1.1
 * ----------------------------------------------------------------
 * Composite, full-page placeholder used as the `Suspense` fallback for
 * lazy-loaded store routes (Village, Subscriptions, Restaurants,
 * Kitchen, Meat …).
 *
 * Composition (top → bottom, mirrors the real page anatomy):
 *   1. PageHeaderSkeleton   — back nav + title
 *   2. Optional hero banner — 1 banner card
 *   3. CategoryGridSkeleton — 6 chips/tiles
 *   4. Section title row    — "تصفح كل المنتجات"
 *   5. ProductCardSkeleton  — 2-column grid (Mobile-First baseline)
 *
 * The component is intentionally side-effect free so it can render
 * during route preloading, SSR, or an offline cold-start. No data
 * fetching, no context dependencies.
 */

import { memo } from "react";
import { cn } from "@/lib/utils";
import { SkBlock, SkTitle } from "./_primitives";
import PageHeaderSkeleton from "./PageHeaderSkeleton";
import CategoryGridSkeleton from "./CategoryGridSkeleton";
import ProductCardSkeleton from "./ProductCardSkeleton";

interface Props {
  /** Number of product cards in the grid (default 6 = 3 mobile rows). */
  productCount?: number;
  /** Hide categories row (e.g. for sub-detail screens). */
  hideCategories?: boolean;
  /** Show a slim hero banner under the header. */
  withHero?: boolean;
  className?: string;
}

const StorePageSkeleton = memo(function StorePageSkeleton({
  productCount = 6,
  hideCategories = false,
  withHero = true,
  className,
}: Props) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="جاري تحميل الصفحة"
      className={cn("space-y-5 px-4 pb-8 pt-3", className)}
    >
      {/* (1) Header */}
      <PageHeaderSkeleton withHero={withHero} />

      {/* (2) Categories row */}
      {!hideCategories && <CategoryGridSkeleton count={6} />}

      {/* (3) Section title */}
      <div className="flex items-center justify-between pt-1">
        <SkTitle className="h-4 w-32" />
        <SkBlock className="h-3 w-12 rounded-md" />
      </div>

      {/* (4) Product grid — mobile-first 2 columns */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {Array.from({ length: productCount }).map((_, i) => (
          <ProductCardSkeleton key={i} variant="grid" />
        ))}
      </div>
    </div>
  );
});

export default StorePageSkeleton;
