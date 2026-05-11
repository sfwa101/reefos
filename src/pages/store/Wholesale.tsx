import BackHeader from "@/components/BackHeader";
import { LayoutFactory } from "@/apps/reef-al-madina/features/storefront/home/components/LayoutFactory";
import { storeThemes } from "@/lib/storeThemes";
import { getSectionIdentity } from "@/core/catalog/registry/SectionIdentityRegistry";
import { SectionHeroBanner } from "@/core/runtime-ui/sections/SectionHeroBanner";

const identity = getSectionIdentity("wholesale")!;

const Wholesale = () => (
  <div className="space-y-4 pb-32 bg-background" dir="rtl">
    <BackHeader title={identity.title} subtitle={identity.subtitle} />
    <SectionHeroBanner identity={identity} />
    <LayoutFactory pageKey="reef_wholesale" theme={storeThemes[identity.themeKey]} />
  </div>
);

export default Wholesale;
