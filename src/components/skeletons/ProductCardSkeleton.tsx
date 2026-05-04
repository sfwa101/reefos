/**
 * ProductCardSkeleton — Phase 3 / SEV-1.1
 * ----------------------------------------------------------------
 * Pixel-faithful placeholder for `<ProductCard variant="grid|carousel">`.
 *
 * The dimensions and rounding MUST match the real card so that when the
 * lazy chunk hydrates, the layout doesn't shift (CLS = 0).
 *
 * Real card reference: src/components/ProductCard.tsx
 *   - grid: w-full, image aspect 1:1, rounded-3xl
 *   - carousel: w-[160px] shrink-0, same image aspect
 *   - meta block: title + price + add button
 *
 * Mobile-first: defaults to grid sizing (which is full-width column),
 * never assumes a desktop grid.
 */

import { memo } from "react";
import { cn } from "@/lib/utils";
import { SkBlock, SkLine, SkTitle } from "./_primitives";

interface Props {
  variant?: "grid" | "carousel";
  className?: string;
}

const ProductCardSkeleton = memo(function ProductCardSkeleton({
  variant = "grid",
  className,
}: Props) {
  const widthCls = variant === "carousel" ? "w-[160px] shrink-0" : "w-full";
  return (
    <div
      role="status"
      aria-label="جاري تحميل المنتج"
      className={cn(
        widthCls,
        "rounded-3xl bg-card p-2 ring-1 ring-border/40",
        className,
      )}
    >
      {/* Image placeholder — square 1:1 to match real OptimizedImage */}
      <SkBlock className="aspect-square w-full rounded-2xl" />

      {/* Title + 2nd line */}
      <div className="mt-2.5 space-y-1.5 px-0.5">
        <SkTitle className="h-3.5 w-[80%]" />
        <SkLine className="h-2.5 w-[55%]" />
      </div>

      {/* Footer: price + add button */}
      <div className="mt-3 flex items-center justify-between px-0.5 pb-0.5">
        <SkBlock className="h-4 w-14 rounded-md" />
        <SkBlock className="h-8 w-8 rounded-full" />
      </div>
    </div>
  );
});

export default ProductCardSkeleton;
