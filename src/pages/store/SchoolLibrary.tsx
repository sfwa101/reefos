import { LayoutFactory } from "@/apps/reef-al-madina/features/storefront/home/components/LayoutFactory";
import { storeThemes } from "@/lib/storeThemes";

const SchoolLibrary = () => (
  <LayoutFactory pageKey="reef_school_library" theme={storeThemes.supermarket} />
);

export default SchoolLibrary;
