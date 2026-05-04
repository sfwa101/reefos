import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
import StorePageSkeleton from "@/components/skeletons/StorePageSkeleton";
import { productsQueryOptions } from "@/hooks/useProductsQuery";

export const Route = createFileRoute("/_app/store/supermarket")({
  // Zero-wait nav: warm the shared products catalog in parallel with the
  // lazy chunk. The supermarket pool filters from the same SWR cache, so
  // by the time the chunk hydrates the catalog is already on hand.
  loader: ({ context: { queryClient } }) => {
    void queryClient.ensureQueryData(productsQueryOptions());
  },
  pendingComponent: () => <StorePageSkeleton productCount={8} withHero />,
  component: lazyRouteComponent(
    () => import("@/modules/supermarket/SupermarketPage"),
  ),
});
