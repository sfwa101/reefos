import { createFileRoute } from "@tanstack/react-router";
import { lazyStorePageWith } from "../-lazyRoute";
import StorePageSkeleton from "@/components/skeletons/StorePageSkeleton";

export const Route = createFileRoute("/_app/store/meat")({
  component: lazyStorePageWith(
    () => import("@/modules/meat/MeatPage"),
    <StorePageSkeleton productCount={6} withHero />,
  ),
});
