import { createFileRoute } from "@tanstack/react-router";
import { lazyStorePageWith } from "../-lazyRoute";
import StorePageSkeleton from "@/components/skeletons/StorePageSkeleton";
import { productsQueryOptions } from "@/hooks/useProductsQuery";

export const Route = createFileRoute("/_app/store/village")({
  // Zero-wait nav: warm the products catalog in parallel with the lazy chunk.
  // Village filters from the same shared catalog cache as the rest of the
  // store, so this benefits every other store route too (single cache key).
  loader: ({ context: { queryClient } }) => {
    void queryClient.ensureQueryData(productsQueryOptions());
  },
  component: lazyStorePageWith(
    () => import("@/modules/village/VillagePage"),
    <StorePageSkeleton productCount={6} withHero />,
  ),
});
