// Helpers: wrap lazy-loaded page components with a Suspense boundary so the
// router config stays tiny while we still avoid white-flashes during chunk
// fetches. `lazyStorePage` keeps its store-specific skeleton variants;
// `lazyPage` is a generic version reused by non-store critical routes.

import { Suspense, lazy, type ComponentType, type ReactNode } from "react";
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

/**
 * NOTE: `lazyStorePageWith` was removed — the TanStack Router code-splitter
 * cannot parse JSX passed inline to `component:` (?tsr-split=component throws
 * a Babel SyntaxError). Use the native `pendingComponent` + `lazyRouteComponent`
 * pattern in the route file instead. This also keeps the skeleton in the
 * critical bundle (instant paint) instead of bundled with the lazy chunk.
 */

/**
 * Generic lazy page wrapper for critical non-store routes (cart, product
 * detail, account, admin marketing, …). Uses StoreSkeleton by default but
 * accepts any custom fallback node for tighter UX matching.
 */
export function lazyPage(
  loader: () => Promise<{ default: ComponentType<unknown> }>,
  fallback: ReactNode = <StoreSkeleton variant="detail" rows={4} />,
) {
  const LazyPage = lazy(loader);
  return function LazyRouteComponent() {
    return (
      <Suspense fallback={fallback}>
        <LazyPage />
      </Suspense>
    );
  };
}
