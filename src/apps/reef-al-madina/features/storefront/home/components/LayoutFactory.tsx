/**
 * LayoutFactory — Phase 20 Server-Driven UI renderer.
 * ---------------------------------------------------
 * Reads the `ui_layouts` row for a given `page_key` and renders the
 * registered sections in the DB-defined order. Unknown sections (e.g.
 * a future "FlashDeals" listed in the DB before the component ships)
 * are silently skipped, never breaking the page.
 *
 * The factory is intentionally PURE PRESENTATION:
 *   - no fetching of product data (the orchestrator owns that)
 *   - no business logic
 *   - just wiring DB metadata → JSX
 *
 * To add an Elementor-style section: register a renderer in `REGISTRY`,
 * push the key into the seed migration's `section_order`, and a future
 * Admin UI can re-order without code changes.
 */
import { memo, type ReactElement } from "react";
import { BestSellersRail } from "./BestSellersRail";
import { BundlesRail } from "./BundlesRail";
import { CategoriesGrid } from "./CategoriesGrid";
import { HeroBanner } from "./HeroBanner";
import { ProductsGrid } from "./ProductsGrid";
import { SearchAndFilters } from "./SearchAndFilters";
import { useUiLayout } from "../hooks/useUiLayout";
import type { SectionConfig, SectionKey } from "../types/sdui.types";
import type { HomeOrchestrator } from "../hooks/useHomeOrchestrator";
import type { CatId } from "../types";
import { SectionFrame } from "@/core-os/sdui-engine/SectionFrame";

// Phase 26 — Main Hub stem cells (orchestrator-free, self-contained)
import { MainSearchHeader } from "@/apps/reef-al-madina/features/main-hub/components/MainSearchHeader";
import { StoryCircles } from "@/apps/reef-al-madina/features/main-hub/components/StoryCircles";
import { PromotionSlider } from "@/apps/reef-al-madina/features/main-hub/components/PromotionSlider";
import { DepartmentGrid } from "@/apps/reef-al-madina/features/main-hub/components/DepartmentGrid";

type FactoryContext = {
  /** Orchestrator is optional — Main Hub sections don't need it. */
  orchestrator: HomeOrchestrator | null;
  theme: { hue: string; ink: string; soft: string; gradient: string };
  showRails: boolean;
};

type SectionRenderer = (ctx: FactoryContext, cfg: SectionConfig) => ReactElement | null;

// Phase U — memoized section wrappers. Each wrapper compares its specific
// inputs and skips re-render when the parent re-renders without changes.
const MemoCategoriesGrid = memo(CategoriesGrid);
const MemoBestSellersRail = memo(BestSellersRail);
const MemoBundlesRail = memo(BundlesRail);
const MemoProductsGrid = memo(ProductsGrid);
const MemoHeroBanner = memo(HeroBanner);
const MemoSearchAndFilters = memo(SearchAndFilters);

const REGISTRY: Partial<Record<SectionKey, SectionRenderer>> = {
  HeroBanner: ({ theme }) => <MemoHeroBanner theme={theme} />,
  SearchAndFilters: ({ orchestrator: o, theme }) =>
    o ? (
      <MemoSearchAndFilters
        q={o.q}
        setQ={o.setQ}
        filtersActive={o.filtersActive}
        onOpenFilters={() => o.setFiltersOpen(true)}
        fulFilter={o.fulFilter}
        setFulFilter={o.setFulFilter}
        sort={o.sort}
        setSort={o.setSort}
        hue={theme.hue}
      />
    ) : null,
  CategoriesGrid: ({ orchestrator: o, theme }) =>
    o ? <MemoCategoriesGrid cat={o.cat} setCat={o.setCat} hue={theme.hue} /> : null,
  BundlesRail: ({ orchestrator: o, theme, showRails }) =>
    showRails && o ? <MemoBundlesRail catalog={o.catalog} hue={theme.hue} /> : null,
  BestSellersRail: ({ orchestrator: o, theme, showRails }) =>
    showRails && o ? (
      <MemoBestSellersRail
        items={o.bestSellers}
        hue={theme.hue}
        onOpen={(id) => o.setOpenId(id)}
      />
    ) : null,
  ProductsGrid: ({ orchestrator: o, theme }) =>
    o ? (
      <MemoProductsGrid
        cat={o.cat as CatId}
        filtered={o.filtered}
        hue={theme.hue}
        onOpen={(id) => o.setOpenId(id)}
        onResetAll={o.resetAll}
      />
    ) : null,

  // Phase 26 — Main Hub (no orchestrator dependency)
  MainSearchHeader: () => <MainSearchHeader />,
  StoryCircles: () => <StoryCircles />,
  PromotionSlider: () => <PromotionSlider />,
  DepartmentGrid: () => <DepartmentGrid />,
};

export const LayoutFactory = ({
  pageKey,
  orchestrator = null,
  theme,
}: {
  pageKey: string;
  orchestrator?: HomeOrchestrator | null;
  theme: { hue: string; ink: string; soft: string; gradient: string };
}) => {
  const { layout, loading } = useUiLayout(pageKey);

  if (loading) {
    return (
      <div className="space-y-3 px-4 pt-4">
        <div className="h-12 w-3/4 animate-pulse rounded-2xl bg-foreground/10" />
        <div className="h-32 animate-pulse rounded-3xl bg-foreground/5" />
        <div className="flex gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-20 w-20 shrink-0 animate-pulse rounded-2xl bg-foreground/5" />
          ))}
        </div>
      </div>
    );
  }

  if (!layout || !layout.section_order || layout.section_order.length === 0) {
    // Fallback hero — shown when no SDUI config exists for this page yet.
    return (
      <div className="px-4 pt-4">
        <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-primary/15 via-primary/8 to-transparent p-5">
          <p className="text-[11px] font-bold text-primary">🌿 ريف المدينة</p>
          <h1 className="mt-1 font-display text-2xl font-extrabold text-foreground">
            عبق الريف داخل المدينة
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            منتجات طازجة وأسواق متنوعة — توصيل سريع لبابك
          </p>
        </div>
      </div>
    );
  }

  const showRails = orchestrator
    ? orchestrator.cat === "all" && !orchestrator.q
    : true;
  const ctx: FactoryContext = { orchestrator, theme, showRails };

  return (
    <>
      {layout.section_order.map((key, idx) => {
        const cfg = layout.section_config?.[key] ?? {};
        if (cfg.enabled === false) return null;
        const Render = REGISTRY[key];
        if (!Render) return null; // gracefully skip unknown sections
        const node = Render(ctx, cfg);
        if (!node) return null;
        const customTitle = layout.section_titles?.[key] ?? null;
        return (
          <SectionFrame key={`${key}-${idx}`} cfg={cfg} customTitle={customTitle}>
            {node}
          </SectionFrame>
        );
      })}
    </>
  );
};

