/**
 * Home Hero — Unified Server Gateway (Wave P-E · The Great Unification).
 *
 * One server function that fetches BOTH the published mobile home layout
 * and the canonical home-goods catalog section in parallel, returning
 * everything the storefront needs for first paint in a single HTTP
 * round-trip from the client (or zero round-trips when invoked from a
 * route loader during SSR).
 *
 * Consumers (route loader at `/_app/`) seed the existing query caches:
 *   - `["mobile_home_layout_v1"]`
 *   - `["catalog","section","home-goods",48,"vm"]`
 *
 * so downstream `useQuery` calls in `useMobileHomeLayout` and
 * `useHomeOrchestrator` resolve from cache without firing extra requests.
 */
import { createServerFn } from "@tanstack/react-start";

import { getPublicLayoutFn } from "@/lib/section-manager.functions";
import { listProductsBySectionFn } from "@/core/catalog/service/catalog.functions";
import type { MobileHomeLayoutV1 } from "@/lib/section-manager.types";
import type { ProductCardVM } from "@/core/catalog/types";

export interface HomeHeroData {
  layout: MobileHomeLayoutV1;
  heroProducts: ProductCardVM[];
}

export const HOME_HERO_LIMIT = 48 as const;
export const HOME_HERO_SLUG = "home-goods" as const;

export const getHomeHeroDataFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<HomeHeroData> => {
    const [layout, list] = await Promise.all([
      getPublicLayoutFn(),
      listProductsBySectionFn({
        data: {
          sectionSlug: HOME_HERO_SLUG,
          limit: HOME_HERO_LIMIT,
          sort: "popularity",
        },
      }),
    ]);
    return { layout, heroProducts: list.items };
  },
);
