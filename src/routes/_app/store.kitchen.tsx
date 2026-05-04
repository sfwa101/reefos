import { createFileRoute } from "@tanstack/react-router";
import { lazyStorePageWith } from "../-lazyRoute";
import StorePageSkeleton from "@/components/skeletons/StorePageSkeleton";

export const Route = createFileRoute("/_app/store/kitchen")({
  component: lazyStorePageWith(
    () => import("@/modules/kitchen/KitchenPage"),
    <StorePageSkeleton productCount={6} withHero />,
  ),
});
