/**
 * Produce storefront — Wave 2.E migration to the HomeGoods gold-standard
 * pattern. Thin orchestration shell using `useHomeOrchestrator("produce")`.
 */
import BackHeader from "@/components/BackHeader";
import { useUI } from "@/context/UIContext";
import { storeThemes } from "@/lib/storeThemes";

import SduiCategoryPage from "@/apps/reef-al-madina/features/storefront/components/SduiCategoryPage";
import { CompareBar } from "@/apps/reef-al-madina/features/storefront/home/components/CompareBar";
import { DetailSheet } from "@/apps/reef-al-madina/features/storefront/home/components/DetailSheet";
import { FiltersSheet } from "@/apps/reef-al-madina/features/storefront/home/components/FiltersSheet";
import { LayoutFactory } from "@/apps/reef-al-madina/features/storefront/home/components/LayoutFactory";
import { useHomeOrchestrator } from "@/apps/reef-al-madina/features/storefront/home/hooks/useHomeOrchestrator";
import { getSectionIdentity } from "@/core/catalog/registry/SectionIdentityRegistry";
import { SectionHeroBanner } from "@/core/runtime-ui/sections/SectionHeroBanner";

const identity = getSectionIdentity("produce")!;

const USE_GATEWAY = true;

const Produce = () => {
  const theme = storeThemes.produce;
  const { viewMode } = useUI();
  const o = useHomeOrchestrator("produce");

  if (!USE_GATEWAY) {
    return <SduiCategoryPage themeKey="produce" pageKey="category_produce" title="الخضار والفواكه" />;
  }

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

      <LayoutFactory pageKey="category_produce" orchestrator={o} theme={theme} />

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
        <DetailSheet product={o.opened} onClose={() => o.setOpenId(null)} />
      )}
    </div>
  );
};

export default Produce;
