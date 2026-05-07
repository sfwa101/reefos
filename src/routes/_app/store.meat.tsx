import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
import StorePageSkeleton from "@/components/skeletons/StorePageSkeleton";
import { homeProductsQueryOptions } from "@/hooks/useProductsQuery";

export const Route = createFileRoute("/_app/store/meat")({
  // Phase 4.3 — Capped, source-scoped warm. Replaces the legacy 2000-row
  // `productsQueryOptions()` warm to eliminate the memory crunch on entry.
  loader: ({ context: { queryClient } }) => {
    void queryClient.ensureQueryData(homeProductsQueryOptions(48, "meat"));
  },
  pendingComponent: () => <StorePageSkeleton productCount={6} withHero />,
  component: lazyRouteComponent(() => import("@/modules/meat/MeatPage")),
});
