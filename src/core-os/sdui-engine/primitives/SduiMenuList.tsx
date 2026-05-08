/**
 * SduiMenuList — Phase 30 advanced primitive.
 * Sticky-category menu list with cart integration. Dispatches the
 * concrete domain implementation by `cfg.variant`.
 */
import { lazy, Suspense } from "react";
import type { SectionConfig } from "../types";

const RestaurantsMenuSection = lazy(
  () => import("@/apps/reef-al-madina/features/restaurants/components/RestaurantsMenuSection"),
);

export const SduiMenuList = ({ cfg }: { cfg: SectionConfig & { variant?: string } }) => {
  const variant = cfg?.variant ?? "restaurants";
  return (
    <Suspense fallback={<div className="h-40 animate-pulse rounded-3xl bg-muted/40" />}>
      {variant === "restaurants" ? <RestaurantsMenuSection /> : null}
    </Suspense>
  );
};

export default SduiMenuList;
