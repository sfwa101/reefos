import { createFileRoute } from "@tanstack/react-router";
import { lazyStorePageWith } from "../_lazyRoute";
import StorePageSkeleton from "@/components/skeletons/StorePageSkeleton";

export const Route = createFileRoute("/_app/store/subscription")({
  component: lazyStorePageWith(
    () => import("@/pages/store/Subscriptions"),
    <StorePageSkeleton productCount={4} hideCategories withHero />,
  ),
});
