import { createFileRoute } from "@tanstack/react-router";
import { lazyStorePageWith } from "../-lazyRoute";
import StorePageSkeleton from "@/components/skeletons/StorePageSkeleton";
import { productsQueryOptions } from "@/hooks/useProductsQuery";

export const Route = createFileRoute("/_app/store/meat")({
  // Zero-wait nav: warm the shared products catalog in parallel with the
  // lazy chunk. Meat filters from `source === "meat"` on the same cache.
  loader: ({ context: { queryClient } }) => {
    void queryClient.ensureQueryData(productsQueryOptions());
  },
  component: lazyStorePageWith(
    () => import("@/modules/meat/MeatPage"),
    <StorePageSkeleton productCount={6} withHero />,
  ),
});
