/**
 * SduiComparisonGrid — Phase 30 advanced primitive.
 * Side-by-side comparison surface. Dispatches by `cfg.variant`:
 *   - "wholesale"          → bulk pack comparison storefront
 *   - "compare_home_goods" → user-curated home goods compare board
 */
import { lazy, Suspense } from "react";
import type { SectionConfig } from "../types";

const WholesaleComparisonSection = lazy(
  () => import("@/core/runtime-ui/blocks/product/compare-section"),
);
const CompareHomeGoodsSection = lazy(
  () => import("@/apps/reef-al-madina/features/compare/components/CompareHomeGoodsSection"),
);

export const SduiComparisonGrid = ({ cfg }: { cfg: SectionConfig & { variant?: string } }) => {
  const variant = cfg?.variant;
  return (
    <Suspense fallback={<div className="h-40 animate-pulse rounded-3xl bg-muted/40" />}>
      {variant === "wholesale" && <WholesaleComparisonSection />}
      {variant === "compare_home_goods" && <CompareHomeGoodsSection />}
    </Suspense>
  );
};

export default SduiComparisonGrid;
