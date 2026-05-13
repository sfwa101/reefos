/**
 * Sections — Phase 34 Tri-Mode Departments.
 * ------------------------------------------
 * No BackHeader. Title rendered by the DepartmentGrid stem cell directly
 * under the Sovereign TopBar, with the tri-mode toggle inline. Spiritual
 * dormancy envelope mirrors Home.tsx.
 */
import { LayoutFactory } from "@/apps/reef-al-madina/features/storefront/home/components/LayoutFactory";
import { storeThemes } from "@/lib/storeThemes";
import { useSovereignPrayerStore } from "@/core/spirit/useSovereignPrayer";

const HUB_THEME = storeThemes.supermarket;
const HUB_PAGE_KEY = "departments_hub";

const Sections = () => {
  const isDormant = useSovereignPrayerStore((s) => s.isDormant);

  return (
    <div
      className={`min-h-screen pb-24 transition-all duration-700 ${
        isDormant ? "opacity-50 saturate-[.6] blur-[.4px]" : ""
      }`}
      dir="rtl"
    >
      <div className="space-y-6 pt-2">
        <LayoutFactory pageKey={HUB_PAGE_KEY} theme={HUB_THEME} />
      </div>
    </div>
  );
};

export default Sections;
