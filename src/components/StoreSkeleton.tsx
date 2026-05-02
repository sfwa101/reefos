// Universal store-page skeleton — wraps UniversalPremiumSkeleton with the
// store layout's standard padding so route-level Suspense fallbacks match
// the final hydrated page exactly (no white flashes, no layout shift).

import { memo } from "react";
import UniversalPremiumSkeleton from "./UniversalPremiumSkeleton";

interface Props {
  variant?: "list" | "grid" | "hero" | "detail";
  rows?: number;
}

const StoreSkeleton = memo(function StoreSkeleton({ variant = "hero", rows = 6 }: Props) {
  return (
    <div className="px-4 pt-3 pb-6 space-y-4">
      <UniversalPremiumSkeleton variant={variant} rows={rows} />
    </div>
  );
});

export default StoreSkeleton;
