import { createFileRoute } from "@tanstack/react-router";
import { lazyStorePageWith } from "../-lazyRoute";
import StorePageSkeleton from "@/components/skeletons/StorePageSkeleton";

export const Route = createFileRoute("/_app/store/restaurants")({
  component: lazyStorePageWith(
    () => import("@/modules/restaurants/RestaurantsPage"),
    <StorePageSkeleton productCount={6} withHero />,
  ),
});
