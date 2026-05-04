import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
import StorePageSkeleton from "@/components/skeletons/StorePageSkeleton";
import { restaurantQueryOptions } from "@/core/data/restaurantQueries";

export const Route = createFileRoute("/_app/store/restaurants")({
  // Zero-wait navigation: kick off the Supabase fetch in parallel with the
  // lazy code chunk download. By the time the page module resolves, the
  // restaurants data is usually already in the React Query cache.
  loader: ({ context: { queryClient } }) => {
    void queryClient.ensureQueryData(restaurantQueryOptions());
  },
  // pendingComponent stays in the critical bundle → no skeleton flash gap.
  pendingComponent: () => <StorePageSkeleton productCount={6} withHero />,
  component: lazyRouteComponent(() => import("@/modules/restaurants/RestaurantsPage")),
});
