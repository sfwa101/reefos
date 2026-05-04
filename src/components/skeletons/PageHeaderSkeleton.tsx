/**
 * PageHeaderSkeleton — Phase 3 / SEV-1.1
 * ----------------------------------------------------------------
 * Mirrors the standard <BackHeader /> + hero strip used at the top of
 * every store/account page. Critical for matching layout heights so
 * the navigation chrome doesn't jump when the real page hydrates.
 *
 * Mobile-first: dimensions sized for a 375 CSS-px viewport.
 */

import { memo } from "react";
import { cn } from "@/lib/utils";
import { SkBlock, SkLine, SkTitle } from "./_primitives";

interface Props {
  /** When true, renders a slim hero strip below the title (banner area). */
  withHero?: boolean;
  className?: string;
}

const PageHeaderSkeleton = memo(function PageHeaderSkeleton({
  withHero = false,
  className,
}: Props) {
  return (
    <div
      role="status"
      aria-label="جاري تحميل الصفحة"
      className={cn("space-y-3", className)}
    >
      {/* Top row — back chevron + title block + action chip */}
      <div className="flex items-center gap-3">
        <SkBlock className="h-9 w-9 rounded-2xl" />
        <div className="flex-1 space-y-1.5">
          <SkTitle className="h-4 w-[55%]" />
          <SkLine className="h-2.5 w-[35%]" />
        </div>
        <SkBlock className="h-8 w-16 rounded-full" />
      </div>

      {withHero && (
        <SkBlock className="h-28 w-full rounded-3xl" />
      )}
    </div>
  );
});

export default PageHeaderSkeleton;
