// Helper: wrap a lazy-loaded page component with a Suspense boundary that
// shows StoreSkeleton during the chunk fetch. Used by store/* routes to
// guarantee zero white-flashes while keeping route config tiny.

import { Suspense, lazy, type ComponentType } from "react";
import StoreSkeleton from "@/components/StoreSkeleton";

type SkeletonVariant = "list" | "grid" | "hero" | "detail";

export function lazyStorePage(
  loader: () => Promise<{ default: ComponentType<unknown> }>,
  variant: SkeletonVariant = "hero",
  rows = 6,
) {
  const LazyPage = lazy(loader);
  return function StoreRouteComponent() {
    return (
      <Suspense fallback={<StoreSkeleton variant={variant} rows={rows} />}>
        <LazyPage />
      </Suspense>
    );
  };
}
