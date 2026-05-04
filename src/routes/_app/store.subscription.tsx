import { createFileRoute } from "@tanstack/react-router";
import { lazyStorePageWith } from "../-lazyRoute";
import StorePageSkeleton from "@/components/skeletons/StorePageSkeleton";

export const Route = createFileRoute("/_app/store/subscription")({
  component: lazyStorePageWith(
    () => import("@/modules/subscriptions/SubscriptionsPage"),
    <StorePageSkeleton productCount={4} hideCategories withHero />,
  ),
});
