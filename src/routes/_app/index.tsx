import { createFileRoute } from "@tanstack/react-router";
import { queryOptions } from "@tanstack/react-query";
import { lazyPage } from "@/routes/-lazyRoute";
import HomeRedirector from "@/apps/reef-al-madina/features/account/components/HomeRedirector";
import { homeSectionQueryOptions } from "@/apps/reef-al-madina/features/storefront/home/hooks/useHomeOrchestrator";
import {
  getPublicLayoutFn,
  DEFAULT_MOBILE_HOME_LAYOUT,
} from "@/lib/section-manager.functions";

const HomePage = lazyPage(() => import("@/pages/Home"));

// Wave P-D (One Artery) — the loader fires BOTH home-critical reads
// (published mobile layout + sovereign catalog section) in parallel via
// `Promise.all`, sharing the SAME cache keys that the components read on
// mount. Result: exactly ONE network round-trip per artery, started the
// microsecond the route is matched (not after the JS chunk parses).
//
// Both options are no-ops when the persisted IndexedDB cache is still
// fresh (5 min for catalog, 1 h for layout), so warm visits paint from
// disk on the first frame.
const layoutQueryOptions = () =>
  queryOptions({
    queryKey: ["mobile_home_layout_v1"] as const,
    queryFn: () => getPublicLayoutFn(),
    staleTime: 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    initialData: DEFAULT_MOBILE_HOME_LAYOUT,
  });

export const Route = createFileRoute("/_app/")({
  loader: ({ context }) => {
    void Promise.all([
      context.queryClient.ensureQueryData(homeSectionQueryOptions("home", 48)),
      context.queryClient.ensureQueryData(layoutQueryOptions()),
    ]);
  },
  component: () => (
    <HomeRedirector>
      <HomePage />
    </HomeRedirector>
  ),
});
