import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
import StorePageSkeleton from "@/components/skeletons/StorePageSkeleton";

export const Route = createFileRoute("/_app/store/subscription")({
  pendingComponent: () => (
    <StorePageSkeleton productCount={4} hideCategories withHero />
  ),
  component: lazyRouteComponent(
    () => import("@/modules/subscriptions/SubscriptionsPage"),
  ),
});
