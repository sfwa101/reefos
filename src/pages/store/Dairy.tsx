/**
 * Dairy storefront — Phase 20+ SDUI shell migrated to the
 * HomeGoods gold-standard pattern (Wave 2.E).
 *
 * Thin orchestration layer: BackHeader + LayoutFactory + overlays.
 * Data flows through `useHomeOrchestrator("dairy")` which projects the
 * Sovereign Catalog to the legacy HG view-model used by every block.
 */
import BackHeader from "@/components/BackHeader";
import { useUI } from "@/context/UIContext";
import { storeThemes } from "@/lib/storeThemes";

import { CompareBar } from "@/apps/reef-al-madina/features/storefront/home/components/CompareBar";
import { DetailSheet } from "@/apps/reef-al-madina/features/storefront/home/components/DetailSheet";
import { FiltersSheet } from "@/apps/reef-al-madina/features/storefront/home/components/FiltersSheet";
import { LayoutFactory } from "@/apps/reef-al-madina/features/storefront/home/components/LayoutFactory";
import { useHomeOrchestrator } from "@/apps/reef-al-madina/features/storefront/home/hooks/useHomeOrchestrator";

// Feature flag — flip to false to roll back to legacy SduiCategoryPage.
const USE_GATEWAY = true;

const Dairy = () => {
  const theme = storeThemes.dairy;
  const { viewMode } = useUI();
  const o = useHomeOrchestrator("dairy");

  if (!USE_GATEWAY) {
    // Fallback path retained intentionally; toggle the flag to restore.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Legacy = require("@/apps/reef-al-madina/features/storefront/components/SduiCategoryPage").default;
    return <Legacy themeKey="dairy" pageKey="category_dairy" title="الألبان والأجبان" />;
  }

  return (
    <div
      data-view-mode={viewMode}
      className="min-h-screen pb-32"
      style={{
        background: `linear-gradient(180deg, hsl(${theme.soft}) 0%, hsl(var(--background)) 320px)`,
      }}
    >
      <BackHeader title="الألبان والأجبان" />

      <LayoutFactory pageKey="category_dairy" orchestrator={o} theme={theme} />

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

export default Dairy;
