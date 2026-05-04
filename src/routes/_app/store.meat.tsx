import { createFileRoute } from "@tanstack/react-router";
import { lazyStorePageWith } from "../_lazyRoute";
import StorePageSkeleton from "@/components/skeletons/StorePageSkeleton";

export const Route = createFileRoute("/_app/store/meat")({
  component: lazyStorePageWith(
    () => import("@/pages/store/Meat"),
    <StorePageSkeleton productCount={6} withHero />,
  ),
});
