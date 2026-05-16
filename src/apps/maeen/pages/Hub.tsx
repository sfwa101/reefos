/**
 * Maeen Super-App Hub — Phase P0.1 (migrated out of `src/apps/khalil/`).
 * ----------------------------------------------------------------------
 * Thin shell on the Level-4 Matrix. All content is rendered by the
 * registered `MaeenLauncherGrid` section through `<LayoutFactory>`.
 * Section ordering is admin-driven via `ui_layouts` (page_key = "maeen_hub").
 *
 * Sovereign owner: Maeen domain (`src/apps/maeen/`). Must NOT be imported
 * from `src/apps/khalil/` — Khalil is the sovereign transformation OS
 * and does not own the super-app launcher concern (see ADR-0003).
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
