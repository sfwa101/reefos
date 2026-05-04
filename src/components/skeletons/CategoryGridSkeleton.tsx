/**
 * CategoryGridSkeleton — Phase 3 / SEV-1.1
 * ----------------------------------------------------------------
 * Placeholder grid used for store sections, department tiles, and any
 * "tiles + label" layout (e.g. DepartmentGrid, StoreCategoryGrid).
 *
 * Mobile-first defaults: grid-cols-3 on phone, grid-cols-4 from sm,
 * grid-cols-6 from md. NEVER decreases column count at larger
 * breakpoints (no desktop-first reversal).
 */

import { memo } from "react";
import { cn } from "@/lib/utils";
import { SkBlock, SkLine } from "./_primitives";

interface Props {
  /** Number of placeholder tiles (default 9 — fills 3 mobile rows). */
  count?: number;
  className?: string;
}

const CategoryGridSkeleton = memo(function CategoryGridSkeleton({
  count = 9,
  className,
}: Props) {
  return (
    <div
      role="status"
      aria-label="جاري تحميل الأقسام"
      className={cn(
        "grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-6",
        className,
      )}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col items-center gap-2 rounded-2xl bg-card p-2 ring-1 ring-border/30"
        >
          <SkBlock className="h-12 w-12 rounded-2xl" />
          <SkLine className="h-2.5 w-[70%]" />
        </div>
      ))}
    </div>
  );
});

export default CategoryGridSkeleton;
