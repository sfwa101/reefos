/**
 * Offers — Phase 29 Sovereign Unification.
 * ----------------------------------------
 * Now a thin shell on the Level-4 Matrix. All content (header, hero
 * banner, spatio-temporal offer matrix) is rendered by the registered
 * `SpatioTemporalOffersRail` section through `<LayoutFactory>`.
 * Section ordering is admin-driven via `ui_layouts` (page_key = "offers_hub").
 */
import { LayoutFactory } from "@/apps/reef-al-madina/features/storefront/home/components/LayoutFactory";
import { storeThemes } from "@/lib/storeThemes";

const Offers = () => {
  const theme = storeThemes.reef;
  return (
    <div className="space-y-6 lg:px-8" dir="rtl">
      <LayoutFactory pageKey="offers_hub" theme={theme} />
    </div>
  );
};

export default Offers;
