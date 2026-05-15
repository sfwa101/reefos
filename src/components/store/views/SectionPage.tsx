/**
 * SectionPage — Wave P-C · Phase C-2.
 *
 * Sovereign single page shell for every storefront vertical. Reads the
 * `$slug` URL param, resolves a `SectionIdentity` from the registry,
 * spins up the shared `useHomeOrchestrator`, then hands a fully
 * composed `RenderDescriptor` to `RuntimeRenderer`.
 *
 * This page replaces — under the new `/store/$slug` route — every
 * legacy `src/pages/store/<Vertical>.tsx` shell. Legacy literal routes
 * still win precedence in TanStack Router until Phase C-4 deletes them
 * vertical-by-vertical.
 */
import { useParams } from "@tanstack/react-router";
import { useEffect } from "react";
import { useHomeOrchestrator } from "@/apps/reef-al-madina/features/storefront/home/hooks/useHomeOrchestrator";
import { getSectionIdentity } from "@/core/catalog/registry/SectionIdentityRegistry";
import { resolveSectionTree } from "@/core/runtime-ui/ResolveRenderTree";
import { RuntimeRenderer } from "@/core/runtime-ui/RuntimeRenderer";
import { registerCoreBlocks } from "@/core/runtime-ui/blocks";
import "@/apps/reef-al-madina/runtime-blocks/register";
import type { ProductSource } from "@/core/catalog/legacyProduct.types";
import type { StoreThemeKey } from "@/lib/storeThemes";
import type { SectionIdentity } from "@/core/catalog/registry/SectionIdentityRegistry";

// One-time idempotent block registry bootstrap so SectionPage works even
// when the dynamic route is the first runtime-UI consumer in the bundle.
registerCoreBlocks();

const themeToSource = (key: StoreThemeKey): ProductSource | undefined => {
  if (key === "homeTools") return "home";
  if (key === "subscriptions") return undefined;
  return key as ProductSource;
};

const SectionPage = () => {
  const { slug } = useParams({ from: "/_app/store/$slug" });
  const identity = getSectionIdentity(slug) as SectionIdentity;
  const source = themeToSource(identity.themeKey);
  const orchestrator = useHomeOrchestrator(source ?? "home");

  useEffect(() => {
    document.title = `${identity.title} · ريف المدينة`;
  }, [identity.title]);

  const descriptor = resolveSectionTree(identity, orchestrator);

  return (
    <div className="space-y-4 bg-background pb-32 text-foreground" dir="rtl">
      <RuntimeRenderer descriptor={descriptor} />
    </div>
  );
};

export default SectionPage;
