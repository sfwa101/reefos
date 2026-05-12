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
import type { ProductSource } from "@/core/catalog/legacy/legacyProduct.types";
import { useHomeOrchestrator } from "../home/hooks/useHomeOrchestrator";
import { LayoutFactory } from "../home/components/LayoutFactory";
import { DetailSheet } from "../home/components/DetailSheet";
import { FiltersSheet } from "../home/components/FiltersSheet";
import { getSectionIdentity } from "@/core/catalog/registry/SectionIdentityRegistry";
import { SectionHeroBanner } from "@/core/runtime-ui/sections/SectionHeroBanner";

// Maps theme keys → SectionIdentityRegistry slugs.
const themeKeyToIdentitySlug: Partial<Record<StoreThemeKey, string>> = {
  homeTools: "home-goods",
  library: "school-library",
};

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

// Phase 33 — Matrix Purge: theme keys mostly map 1:1 to ProductSource;
// `homeTools` is the only legacy alias that points at the `home` catalog.
const themeToSource = (key: StoreThemeKey): ProductSource | undefined => {
  if (key === "homeTools") return "home";
  if (key === "subscriptions") return undefined; // no direct source
  return key as ProductSource;
};

const SduiCategoryPage = ({
  themeKey,
  pageKey,
  title,
  subtitle,
}: SduiCategoryPageProps) => {
  const theme = storeThemes[themeKey];
  const source = themeToSource(themeKey);
  const orchestrator = useHomeOrchestrator(source ?? "home");
  const identitySlug = themeKeyToIdentitySlug[themeKey] ?? (themeKey as string);
  const identity = getSectionIdentity(identitySlug);

  useEffect(() => {
    document.title = `${identity?.title ?? title} · ريف المدينة`;
  }, [identity, title]);

  return (
    <div className="space-y-4 bg-background pb-32 text-foreground" dir="rtl">
      <BackHeader
        title={identity?.title ?? title}
        subtitle={identity?.subtitle ?? subtitle ?? theme.label}
      />

      {identity && <SectionHeroBanner identity={identity} />}

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
