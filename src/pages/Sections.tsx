/**
 * Sections — Phase 28 Ascension (Level-3 → Level-4).
 * ---------------------------------------------------
 * The hub now consumes the Sovereign `ui_layouts` pipeline through
 * `LayoutFactory`, the same engine that drives `reef_home`. The legacy
 * `sdui_layouts` + `SduiRenderer` runtime is retired here; section
 * presence/order are admin-editable via DB and the hub falls back to
 * a locked Golden Order ([MainSearchHeader, DepartmentGrid]) when no
 * row is published.
 */
import BackHeader from "@/components/BackHeader";
import { LayoutFactory } from "@/apps/reef-al-madina/features/storefront/home/components/LayoutFactory";
import { storeThemes } from "@/lib/storeThemes";

const HUB_THEME = storeThemes.supermarket;
const HUB_PAGE_KEY = "departments_hub";

const Sections = () => {
  return (
    <div className="min-h-screen pb-24" dir="rtl">
      <BackHeader title="مركز الأقسام" />
      <div className="space-y-6 pt-2">
        <LayoutFactory pageKey={HUB_PAGE_KEY} theme={HUB_THEME} />
      </div>
    </div>
  );
};

export default Sections;
