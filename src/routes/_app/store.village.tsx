import { createFileRoute } from "@tanstack/react-router";
import { lazyStorePageWith } from "../-lazyRoute";
import StorePageSkeleton from "@/components/skeletons/StorePageSkeleton";

export const Route = createFileRoute("/_app/store/village")({
  component: lazyStorePageWith(
    () => import("@/modules/village/VillagePage"),
    <StorePageSkeleton productCount={6} withHero />,
  ),
});
