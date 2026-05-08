/**
 * SduiCategoryPage — Phase 20 (Part 1) · Sovereign Category Wrapper.
 *
 * Thin presentational shell for every storefront vertical (Meat,
 * Pharmacy, Sweets, Kitchen, Village, Supermarket, Restaurants,
 * Subscriptions...). Each category page is now a one-liner that hands a
 * `pageKey` to the SDUI engine and a theme to the renderer. Section
 * order, titles, banners, and product rails are entirely DB-driven via
 * `ui_layouts` (page_key = "category_<slug>"). When the row is missing
 * the `useUiLayout` fallback supplies the default order so the page
 * NEVER renders blank.
 */
import { useEffect } from "react";
import BackHeader from "@/components/BackHeader";
import { storeThemes, type StoreThemeKey } from "@/lib/storeThemes";
import { useHomeOrchestrator } from "../home/hooks/useHomeOrchestrator";
import { LayoutFactory } from "../home/components/LayoutFactory";
import { DetailSheet } from "../home/components/DetailSheet";
import { FiltersSheet } from "../home/components/FiltersSheet";

export type SduiCategoryPageProps = {
  /** Theme slug from `storeThemes` (drives hue / soft / gradient). */
  themeKey: StoreThemeKey;
  /** SDUI page key, e.g. "category_meat". */
  pageKey: string;
  /** Header title shown via BackHeader. */
  title: string;
  /** Optional subtitle line. */
  subtitle?: string;
};

const SduiCategoryPage = ({
  themeKey,
  pageKey,
  title,
  subtitle,
}: SduiCategoryPageProps) => {
  const theme = storeThemes[themeKey];
  const orchestrator = useHomeOrchestrator();

  useEffect(() => {
    document.title = `${title} · ريف المدينة`;
  }, [title]);

  return (
    <div className="space-y-4 bg-background pb-32 text-foreground" dir="rtl">
      <BackHeader title={title} subtitle={subtitle ?? theme.label} />

      <LayoutFactory
        pageKey={pageKey}
        orchestrator={orchestrator}
        theme={theme}
      />

      {orchestrator.opened && (
        <DetailSheet
          product={orchestrator.opened}
          onClose={() => orchestrator.setOpenId(null)}
        />
      )}
      {orchestrator.filtersOpen && (
        <FiltersSheet
          sort={orchestrator.sort}
          setSort={orchestrator.setSort}
          fulFilter={orchestrator.fulFilter}
          setFulFilter={orchestrator.setFulFilter}
          priceMax={orchestrator.priceMax}
          setPriceMax={orchestrator.setPriceMax}
          priceMaxAvail={orchestrator.priceMaxAvail}
          onClose={() => orchestrator.setFiltersOpen(false)}
          onReset={orchestrator.resetAll}
          hue={theme.hue}
        />
      )}
    </div>
  );
};

export default SduiCategoryPage;
