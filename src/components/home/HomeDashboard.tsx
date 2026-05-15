/**
 * Home — Phase 20 (Part 1) · Sovereign SDUI Ascension.
 * ----------------------------------------------------
 * The hardcoded React rail-stack has been obliterated. The consumer
 * storefront is now a pure SDUI surface: every section, its order, its
 * title, and its enabled state are read from the `ui_layouts` table
 * (page_key = "reef_home"). Admins gain full runtime control of the
 * homepage without a deploy. Block presence/order is DB-driven; data
 * fetching stays inside the orchestrator (catalog) and individual
 * blocks (banners, categories, etc.).
 *
 * Fallback safety: if no `reef_home` row is published, `useUiLayout`
 * returns `DEFAULT_HOME_ORDER` (Hero → Categories → Bundles →
 * BestSellers → ProductsGrid), so the storefront NEVER renders blank.
 *
 * Hardware-Back guard (scroll-to-top on first back-press) is preserved.
 */
import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { logBehavior } from "@/core/events/behavior";
import { storeThemes } from "@/lib/storeThemes";
import { useHomeOrchestrator } from "@/apps/reef-al-madina/features/storefront/home/hooks/useHomeOrchestrator";
import { LayoutFactory } from "@/apps/reef-al-madina/features/storefront/home/components/LayoutFactory";
import { SduiHomeFeed } from "@/apps/reef-al-madina/features/storefront/home/components/SduiHomeFeed";
import { SovereignSmartShowcase } from "@/apps/reef-al-madina/features/storefront/home/components/SovereignSmartShowcase";
import { DetailSheet } from "@/apps/reef-al-madina/features/storefront/home/components/DetailSheet";
import { FiltersSheet } from "@/apps/reef-al-madina/features/storefront/home/components/FiltersSheet";
import { useSovereignPrayerStore } from "@/core/spirit/useSovereignPrayer";

const HOME_THEME = storeThemes.supermarket;
const HOME_PAGE_KEY = "reef_home";

const HomePage = () => {
  const { user } = useAuth();
  const orchestrator = useHomeOrchestrator();
  const isDormant = useSovereignPrayerStore((s) => s.isDormant);

  // Hardware-Back override — scroll-to-top before exiting on first press.
  useEffect(() => {
    const sentinel = { __homeScrollGuard: true };
    window.history.pushState(sentinel, "", window.location.href);
    const onPop = () => {
      if (window.scrollY > 0) {
        window.scrollTo({ top: 0, behavior: "smooth" });
        window.history.pushState(sentinel, "", window.location.href);
      }
    };
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
      const cur = window.history.state as { __homeScrollGuard?: boolean } | null;
      if (cur && cur.__homeScrollGuard) window.history.back();
    };
  }, []);

  useEffect(() => {
    if (user?.id) void logBehavior({ event: "app_open", force: true });
  }, [user?.id]);

  return (
    <div
      className={`space-y-6 bg-background pb-32 text-foreground transition-all duration-700 ${
        isDormant ? "opacity-50 [&_*]:!animation-play-state-paused saturate-[.6] blur-[.4px]" : ""
      }`}
      dir="rtl"
    >
      <SduiHomeFeed />

      <SovereignSmartShowcase orchestrator={orchestrator} />

      <LayoutFactory
        pageKey={HOME_PAGE_KEY}
        orchestrator={orchestrator}
        theme={HOME_THEME}
      />

      {/* Orchestrator-owned overlays — not part of SDUI flow */}
      {orchestrator.opened && (
        <DetailSheet
          product={orchestrator.opened}
          onClose={() => orchestrator.setOpenId(null)}
        />
      )}
      {orchestrator.filtersOpen && (
        <FiltersSheet
          sort={orchestrator.sort}
          setSort={orchestrator.setSort}
          fulFilter={orchestrator.fulFilter}
          setFulFilter={orchestrator.setFulFilter}
          priceMax={orchestrator.priceMax}
          setPriceMax={orchestrator.setPriceMax}
          priceMaxAvail={orchestrator.priceMaxAvail}
          onClose={() => orchestrator.setFiltersOpen(false)}
          onReset={orchestrator.resetAll}
          hue={HOME_THEME.hue}
        />
      )}
    </div>
  );
};

export default HomePage;
