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
 * Phase 3 — preferred wrapper for store routes once a domain-faithful
 * Skeleton exists (StorePageSkeleton, ProductDetailSkeleton, …). Pass
 * the rendered fallback element directly so different routes can pick
 * different layouts without coupling to the generic StoreSkeleton.
 */
export function lazyStorePageWith(
  loader: () => Promise<{ default: ComponentType<unknown> }>,
  fallback: ReactNode,
) {
  const LazyPage = lazy(loader);
  return function StoreRouteComponent() {
    return (
      <Suspense fallback={fallback}>
        <LazyPage />
      </Suspense>
    );
  };
}

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
