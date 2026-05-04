import { createFileRoute } from "@tanstack/react-router";
import { lazyStorePageWith } from "../-lazyRoute";
import StorePageSkeleton from "@/components/skeletons/StorePageSkeleton";
import { restaurantQueryOptions } from "@/core/data/restaurantQueries";

export const Route = createFileRoute("/_app/store/restaurants")({
  // Zero-wait navigation: kick off the Supabase fetch in parallel with the
  // lazy code chunk download. By the time the page module resolves, the
  // restaurants data is usually already in the React Query cache, so the
  // first paint shows real content (no skeleton flash on warm caches).
  // We deliberately DO NOT await — `ensureQueryData` returns immediately
  // when the cache is fresh; on a cold cache the in-flight promise is
  // shared with `useRestaurantsQuery()` inside the page.
  loader: ({ context: { queryClient } }) => {
    void queryClient.ensureQueryData(restaurantQueryOptions());
  },
  component: lazyStorePageWith(
    () => import("@/modules/restaurants/RestaurantsPage"),
    <StorePageSkeleton productCount={6} withHero />,
  ),
});
