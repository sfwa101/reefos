import { LayoutFactory } from "@/apps/reef-al-madina/features/storefront/home/components/LayoutFactory";
import { storeThemes } from "@/lib/storeThemes";

const Wholesale = () => (
  <LayoutFactory pageKey="reef_wholesale" theme={storeThemes.supermarket} />
);

export default Wholesale;
