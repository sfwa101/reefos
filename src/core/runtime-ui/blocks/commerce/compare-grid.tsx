import { LayoutFactory } from "@/apps/reef-al-madina/features/storefront/home/components/LayoutFactory";
import { storeThemes } from "@/lib/storeThemes";

const CompareGridBlock = () => (
  <LayoutFactory pageKey="reef_compare_home_goods" theme={storeThemes.homeTools} />
);

export default CompareGridBlock;
