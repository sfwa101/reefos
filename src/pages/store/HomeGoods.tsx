/**
 * Home (Home Goods storefront) — Phase 20 SDUI shell.
 *
 * Section ordering and visibility now flow from `ui_layouts` (Supabase),
 * rendered by `<LayoutFactory>`. Behaviour parity with Phase 14 is
 * preserved by the seed migration. The page itself is now a pure
 * orchestration shell — overlays + state hub.
 */
import BackHeader from "@/components/BackHeader";
import { useUI } from "@/context/UIContext";
import { storeThemes } from "@/lib/storeThemes";

import { CompareBar } from "@/apps/reef-al-madina/features/storefront/home/components/CompareBar";
import { DetailSheet } from "@/apps/reef-al-madina/features/storefront/home/components/DetailSheet";
import { FiltersSheet } from "@/apps/reef-al-madina/features/storefront/home/components/FiltersSheet";
import { LayoutFactory } from "@/apps/reef-al-madina/features/storefront/home/components/LayoutFactory";
import { useHomeOrchestrator } from "@/apps/reef-al-madina/features/storefront/home/hooks/useHomeOrchestrator";
import { getSectionIdentity } from "@/core/catalog/registry/SectionIdentityRegistry";
import { SectionHeroBanner } from "@/core/runtime-ui/sections/SectionHeroBanner";

const identity = getSectionIdentity("home-goods")!;

const HomeStore = () => {
  const theme = storeThemes.homeTools;
  const { viewMode } = useUI();
  const o = useHomeOrchestrator();

  return (
    <div
      data-view-mode={viewMode}
      className="min-h-screen pb-32"
      style={{
        background: `linear-gradient(180deg, hsl(${theme.soft}) 0%, hsl(var(--background)) 320px)`,
      }}
    >
      <BackHeader title={identity.title} subtitle={identity.subtitle} />

      <SectionHeroBanner identity={identity} />

      <LayoutFactory pageKey="home" orchestrator={o} theme={theme} />

      <CompareBar />

      {o.filtersOpen && (
        <FiltersSheet
          sort={o.sort}
          setSort={o.setSort}
          priceMax={o.priceMax}
          setPriceMax={o.setPriceMax}
          priceMaxAvail={o.priceMaxAvail}
          fulFilter={o.fulFilter}
          setFulFilter={o.setFulFilter}
          onClose={() => o.setFiltersOpen(false)}
          onReset={o.resetFilters}
          hue={theme.hue}
        />
      )}

      {o.opened && (
        <DetailSheet
          product={o.opened}
          onClose={() => o.setOpenId(null)}
        />
      )}
    </div>
  );
};

export default HomeStore;
