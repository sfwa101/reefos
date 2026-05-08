/**
 * Maeen Super-App Hub — Phase 29 Sovereign Unification.
 * -----------------------------------------------------
 * Now a thin shell on the Level-4 Matrix. All content is rendered by
 * the registered `MaeenLauncherGrid` section through `<LayoutFactory>`.
 * Section ordering is admin-driven via `ui_layouts` (page_key = "maeen_hub").
 */
import { LayoutFactory } from "@/apps/reef-al-madina/features/storefront/home/components/LayoutFactory";
import { storeThemes } from "@/lib/storeThemes";

const MaeenHub = () => {
  const theme = storeThemes.supermarket;
  return (
    <div dir="rtl" className="min-h-screen bg-background pb-24">
      <main className="mx-auto max-w-2xl px-4 pt-4">
        <LayoutFactory pageKey="maeen_hub" theme={theme} />
      </main>
    </div>
  );
};

export default MaeenHub;
