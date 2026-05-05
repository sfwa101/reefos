import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
import StorePageSkeleton from "@/components/skeletons/StorePageSkeleton";

// Phase 21.1 pilot — Supermarket no longer warms the legacy
// `ensureProductsLoaded` global cache. The page consumes the new
// server-driven `usePagedProducts` infinite query (50 items / page)
// and streams pages via IntersectionObserver.
export const Route = createFileRoute("/_app/store/supermarket")({
  pendingComponent: () => <StorePageSkeleton productCount={8} withHero />,
  component: lazyRouteComponent(
    () => import("@/modules/supermarket/SupermarketPage"),
  ),
});
