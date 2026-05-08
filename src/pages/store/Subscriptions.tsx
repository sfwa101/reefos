import { LayoutFactory } from "@/apps/reef-al-madina/features/storefront/home/components/LayoutFactory";
import { storeThemes } from "@/lib/storeThemes";

const Subscriptions = () => (
  <LayoutFactory pageKey="reef_subscriptions" theme={storeThemes.supermarket} />
);

export default Subscriptions;
