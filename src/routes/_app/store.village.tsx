import { createFileRoute } from "@tanstack/react-router";
import { lazyStorePageWith } from "../-lazyRoute";
import StorePageSkeleton from "@/components/skeletons/StorePageSkeleton";

export const Route = createFileRoute("/_app/store/village")({
  component: lazyStorePageWith(
    () => import("@/pages/store/Village"),
    <StorePageSkeleton productCount={6} withHero />,
  ),
});
