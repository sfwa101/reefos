import { createFileRoute, lazyRouteComponent, useRouter } from "@tanstack/react-router";
import StorePageSkeleton from "@/components/skeletons/StorePageSkeleton";

// Phase 21.1 pilot — Supermarket no longer warms the legacy
// `ensureProductsLoaded` global cache. The page consumes the new
// server-driven `usePagedProducts` infinite query (50 items / page)
// and streams pages via IntersectionObserver.
export const Route = createFileRoute("/_app/store/supermarket")({
  pendingComponent: () => <StorePageSkeleton productCount={8} withHero />,
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    console.error("[SupermarketRoute] crash:", error);
    return (
      <div dir="rtl" className="m-4 rounded-2xl border border-destructive/40 bg-destructive/5 p-4 text-sm">
        <h2 className="mb-2 font-bold text-destructive">تعطّل قسم السوبرماركت</h2>
        <p className="mb-2 font-mono text-xs text-foreground">{error.message}</p>
        <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded bg-background/60 p-2 font-mono text-[10px] text-muted-foreground">
          {error.stack}
        </pre>
        <button
          onClick={() => { router.invalidate(); reset(); }}
          className="mt-3 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground"
        >
          إعادة المحاولة
        </button>
      </div>
    );
  },
  notFoundComponent: () => (
    <div dir="rtl" className="m-4 text-center text-sm text-muted-foreground">القسم غير موجود</div>
  ),
  component: lazyRouteComponent(
    () => import("@/modules/supermarket/SupermarketPage"),
  ),
});
