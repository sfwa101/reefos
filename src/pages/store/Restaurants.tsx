/**
 * Restaurants — Phase 30 thin shell on the Sovereign Matrix.
 * Body content lives in `RestaurantsMenuSection` and is rendered through
 * the `SduiMenuList` primitive driven by `ui_layouts.page_key = "reef_restaurants"`.
 */
import BackHeader from "@/components/BackHeader";
import { LayoutFactory } from "@/apps/reef-al-madina/features/storefront/home/components/LayoutFactory";
import { storeThemes } from "@/lib/storeThemes";
import { getSectionIdentity } from "@/core/catalog/registry/SectionIdentityRegistry";
import { SectionHeroBanner } from "@/core/runtime-ui/sections/SectionHeroBanner";

const identity = getSectionIdentity("restaurants")!;

const Restaurants = () => (
  <div className="space-y-4 pb-32 bg-background" dir="rtl">
    <BackHeader title={identity.title} subtitle={identity.subtitle} />
    <SectionHeroBanner identity={identity} />
    <LayoutFactory pageKey="reef_restaurants" theme={storeThemes[identity.themeKey]} />
  </div>
);

export default Restaurants;
