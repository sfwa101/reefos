/**
 * Restaurants — Phase 30 thin shell on the Sovereign Matrix.
 * Body content lives in `RestaurantsMenuSection` and is rendered through
 * the `SduiMenuList` primitive driven by `ui_layouts.page_key = "reef_restaurants"`.
 */
import { LayoutFactory } from "@/apps/reef-al-madina/features/storefront/home/components/LayoutFactory";
import { storeThemes } from "@/lib/storeThemes";

const Restaurants = () => (
  <LayoutFactory pageKey="reef_restaurants" theme={storeThemes.restaurants} />
);

export default Restaurants;
