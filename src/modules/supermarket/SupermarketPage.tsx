// SupermarketPage — Lego shell for the supermarket vertical.
// Composes the hero (back-header + rails), the dual sticky nav, and the
// grouped product grid. All state lives in `useSupermarketLogic`.

import SmartPairingWatcher from "@/components/store/SmartPairingWatcher";
import { Search } from "lucide-react";
import { useSupermarketLogic } from "./hooks/useSupermarketLogic";
import { CategorySidebar } from "./components/CategorySidebar";
import { ProductGrid } from "./components/ProductGrid";
import { SupermarketHero } from "./components/SupermarketHero";
import { SUPERMARKET_NAV } from "./types";

const SupermarketPage = () => {
  const {
    query,
    setQuery,
    grouped,
    visibleSubs,
    activeGroup,
    activeSub,
    mainBarRef,
    subBarRef,
    registerSectionRef,
    jumpToSub,
    jumpToGroup,
    loadMoreRef,
    isFetchingNextPage,
    hasNextPage,
  } = useSupermarketLogic();

  // Flat pool used by hero rails (Buy-it-again, Volume-deals).
  const pool = grouped.flatMap((g) => g.subs.flatMap((s) => s.items));

  return (
    <div>
      <SupermarketHero
        title="السوبرماركت"
        subtitle="كل ما تحتاجه يوميًا"
        pool={pool}
        searchSlot={
          <div className="glass mb-3 mt-4 flex items-center gap-3 rounded-2xl px-4 py-3 shadow-soft">
            <Search className="h-4 w-4 text-muted-foreground" strokeWidth={2.4} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ابحث في السوبرماركت…"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
        }
      />

      <CategorySidebar
        grouped={grouped}
        activeGroup={activeGroup}
        activeSub={activeSub}
        visibleSubs={visibleSubs}
        mainBarRef={mainBarRef}
        subBarRef={subBarRef}
        onJumpGroup={jumpToGroup}
        onJumpSub={jumpToSub}
      />

      {/* Spacer so first section isn't hidden under the dual rail */}
      <div
        style={{
          height:
            SUPERMARKET_NAV.MAIN_BAR +
            SUPERMARKET_NAV.SUB_BAR +
            SUPERMARKET_NAV.HEADER_GAP +
            14,
        }}
      />

      <ProductGrid
        grouped={grouped}
        registerSectionRef={registerSectionRef}
        loadMoreRef={loadMoreRef}
        isFetchingNextPage={isFetchingNextPage}
        hasNextPage={hasNextPage}
      />

      <SmartPairingWatcher />
    </div>
  );
};

export default SupermarketPage;
