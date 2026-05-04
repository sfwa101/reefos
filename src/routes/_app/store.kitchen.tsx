import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
import StorePageSkeleton from "@/components/skeletons/StorePageSkeleton";

export const Route = createFileRoute("/_app/store/kitchen")({
  // Skeleton stays in the critical bundle → instant paint on slow chunks.
  pendingComponent: () => <StorePageSkeleton productCount={6} withHero />,
  component: lazyRouteComponent(() => import("@/modules/kitchen/KitchenPage")),
});
