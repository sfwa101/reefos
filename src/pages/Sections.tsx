/**
 * Sections — Phase 32 Sovereign Retribution.
 * ------------------------------------------
 * Level-4 SDUI hub + Spiritual Alignment: page dims/saturates/blurs in
 * sync with `useSovereignPrayerStore.isDormant`, mirroring Home.tsx.
 */
import BackHeader from "@/components/BackHeader";
import { LayoutFactory } from "@/apps/reef-al-madina/features/storefront/home/components/LayoutFactory";
import { storeThemes } from "@/lib/storeThemes";
import { useSovereignPrayerStore } from "@/core-os/spirit/useSovereignPrayer";

const HUB_THEME = storeThemes.supermarket;
const HUB_PAGE_KEY = "departments_hub";

const Sections = () => {
  const isDormant = useSovereignPrayerStore((s) => s.isDormant);

  return (
    <div
      className={`min-h-screen pb-24 transition-all duration-700 ${
        isDormant ? "opacity-50 [&_*]:!animation-play-state-paused saturate-[.6] blur-[.4px]" : ""
      }`}
      dir="rtl"
    >
      <BackHeader title="مركز الأقسام" />
      <div className="space-y-6 pt-2">
        <LayoutFactory pageKey={HUB_PAGE_KEY} theme={HUB_THEME} />
      </div>
    </div>
  );
};

export default Sections;
