import { createFileRoute } from "@tanstack/react-router";
import { lazyStorePageWith } from "../_lazyRoute";
import StorePageSkeleton from "@/components/skeletons/StorePageSkeleton";

export const Route = createFileRoute("/_app/store/kitchen")({
  component: lazyStorePageWith(
    () => import("@/pages/store/Kitchen"),
    <StorePageSkeleton productCount={6} withHero />,
  ),
});
