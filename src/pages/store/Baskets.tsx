import { LayoutFactory } from "@/apps/reef-al-madina/features/storefront/home/components/LayoutFactory";
import { storeThemes } from "@/lib/storeThemes";

const Baskets = () => (
  <LayoutFactory pageKey="reef_baskets" theme={storeThemes.supermarket} />
);

export default Baskets;
