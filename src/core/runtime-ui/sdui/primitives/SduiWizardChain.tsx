/**
 * SduiWizardChain — Phase 30 advanced primitive.
 * Multi-step builder block. Dispatches by `cfg.variant`:
 *   - "subscriptions" → meal subscription plan builder
 *   - "baskets"       → recurring basket builder
 *   - "school_library" → student hub multi-tab flow
 */
import { lazy, Suspense } from "react";
import type { SectionConfig } from "../types";

const SubscriptionsBuilderSection = lazy(
  () => import("@/apps/reef-al-madina/features/recurring-orders/components/SubscriptionsBuilderSection"),
);
const BasketsBuilderSection = lazy(
  () => import("@/apps/reef-al-madina/features/commerce-bundles/components/BasketsBuilderSection"),
);
const SchoolLibrarySection = lazy(
  () => import("@/apps/reef-al-madina/features/digital-borrowing/sections/SchoolLibrarySection"),
);

export const SduiWizardChain = ({ cfg }: { cfg: SectionConfig & { variant?: string } }) => {
  const variant = cfg?.variant;
  return (
    <Suspense fallback={<div className="h-40 animate-pulse rounded-3xl bg-muted/40" />}>
      {variant === "subscriptions" && <SubscriptionsBuilderSection />}
      {variant === "baskets" && <BasketsBuilderSection />}
      {variant === "school_library" && <SchoolLibrarySection />}
    </Suspense>
  );
};

export default SduiWizardChain;
