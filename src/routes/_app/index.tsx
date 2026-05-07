import { createFileRoute } from "@tanstack/react-router";
import { lazyPage } from "@/routes/-lazyRoute";
import HomeRedirector from "@/apps/reef-al-madina/features/account/components/HomeRedirector";
import { homeProductsQueryOptions } from "@/hooks/useProductsQuery";

const HomePage = lazyPage(() => import("@/pages/Home"));

// Phase T-P3 — Salsabil OS Edge: pre-fetch the catalog inside the route
// loader so the network request fires in parallel with the JS chunk
// download instead of after the component mounts. ensureQueryData is a
// no-op when the persisted IndexedDB cache is still fresh, so repeat
// visits skip the network entirely and paint from disk on first frame.
export const Route = createFileRoute("/_app/")({
  loader: ({ context }) => {
    void context.queryClient.ensureQueryData(homeProductsQueryOptions(48));
  },
  component: () => (
    <HomeRedirector>
      <HomePage />
    </HomeRedirector>
  ),
});
