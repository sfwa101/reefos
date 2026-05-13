import { createFileRoute } from "@tanstack/react-router";
import { lazyPage } from "@/routes/-lazyRoute";
import HomeRedirector from "@/apps/reef-al-madina/features/account/components/HomeRedirector";
import { homeSectionQueryOptions } from "@/apps/reef-al-madina/features/storefront/home/hooks/useHomeOrchestrator";
import {
  getHomeHeroDataFn,
  HOME_HERO_LIMIT,
} from "@/core/catalog/gateway/home.functions";

const HomePage = lazyPage(() => import("@/pages/Home"));

// Wave P-E (The Great Unification) — ONE round-trip for first paint.
// The loader awaits a single unified server function that fetches BOTH the
// published mobile home layout and the home-goods catalog section in parallel
// on the server, then seeds the canonical query caches so downstream
// `useQuery` calls in `useMobileHomeLayout` and `useHomeOrchestrator`
// resolve from cache without firing extra network requests.
export const Route = createFileRoute("/_app/")({
  loader: async ({ context }) => {
    const queryClient = context.queryClient;
    const catalogKey = homeSectionQueryOptions("home", HOME_HERO_LIMIT).queryKey;
    const layoutKey = ["mobile_home_layout_v1"] as const;

    // Skip the trip if both caches are already warm.
    const cachedCatalog = queryClient.getQueryData(catalogKey);
    const cachedLayout = queryClient.getQueryData(layoutKey);
    if (cachedCatalog && cachedLayout) return;

    const { layout, heroProducts } = await getHomeHeroDataFn();
    queryClient.setQueryData(layoutKey, layout);
    queryClient.setQueryData(catalogKey, heroProducts);
  },
  component: () => (
    <HomeRedirector>
      <HomePage />
    </HomeRedirector>
  ),
});
