// useSupermarketLogic — single source of state for the Supermarket module.
// ----------------------------------------------------------------------
// Owns: SWR-cached catalog, search query, taxonomy grouping, dual-rail
// scrollspy, jump-to-section. Mirrors the behaviour of the legacy
// `DualNavStore` but exposes a typed surface to dumb child components.

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useInfiniteCatalog } from "@/hooks/useInfiniteCatalog";
import {
  groupBySupermarketTaxonomy,
  groupForSub,
  supermarketPool,
  supermarketTaxonomy,
} from "@/lib/supermarketTaxonomy";
import { storeThemes } from "@/lib/storeThemes";
import type { Product } from "@/lib/products";
import type { SupermarketGroup } from "../types";
import { SUPERMARKET_NAV } from "../types";

interface UseSupermarketLogicResult2 {
  readonly hasNextPage: boolean;
  readonly isFetchingNextPage: boolean;
  readonly fetchNextPage: () => void;
}

interface UseSupermarketLogicResult {
  readonly theme: typeof storeThemes.supermarket;
  readonly query: string;
  readonly setQuery: (next: string) => void;
  readonly grouped: ReadonlyArray<SupermarketGroup>;
  readonly visibleSubs: ReadonlyArray<{ readonly id: string; readonly name: string }>;
  readonly activeGroup: SupermarketGroup["group"];
  readonly activeSub: string;
  readonly mainBarRef: React.MutableRefObject<HTMLDivElement | null>;
  readonly subBarRef: React.MutableRefObject<HTMLDivElement | null>;
  readonly registerSectionRef: (id: string) => (el: HTMLElement | null) => void;
  readonly jumpToSub: (id: string) => void;
  readonly jumpToGroup: (groupId: string) => void;
  readonly isLoading: boolean;
}

export function useSupermarketLogic(): UseSupermarketLogicResult {
  const theme = storeThemes.supermarket;
  const { data: allProducts, isLoading } = useProductsQuery();

  // Restrict the catalog to the supermarket vertical. The pool function
  // is pure — `useMemo` keys on the catalog reference.
  const pool = useMemo(
    () => supermarketPool(allProducts ?? []),
    [allProducts],
  );

  const [query, setQuery] = useState("");
  const [activeSub, setActiveSub] = useState<string>("");

  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const mainBarRef = useRef<HTMLDivElement | null>(null);
  const subBarRef = useRef<HTMLDivElement | null>(null);
  const tickingRef = useRef(false);
  const userJumpUntilRef = useRef(0);

  const grouped = useMemo<ReadonlyArray<SupermarketGroup>>(
    () => groupBySupermarketTaxonomy(pool, query) as SupermarketGroup[],
    [pool, query],
  );

  // Initialise active sub to the first available section once data lands.
  useEffect(() => {
    if (!activeSub && grouped[0]?.subs[0]) {
      setActiveSub(grouped[0].subs[0].sub.id);
    }
  }, [grouped, activeSub]);

  const activeGroup = useMemo<SupermarketGroup["group"]>(() => {
    const fallback = supermarketTaxonomy[0] as SupermarketGroup["group"];
    const found = groupForSub(activeSub) as SupermarketGroup["group"] | null;
    return found ?? fallback;
  }, [activeSub]);

  const visibleSubs = useMemo(() => {
    const g = grouped.find((x) => x.group.id === activeGroup.id);
    return g?.subs.map((s) => s.sub) ?? [];
  }, [grouped, activeGroup]);

  // Scrollspy — rAF-throttled, suppressed briefly after a user jump.
  useEffect(() => {
    const flatSubs: { id: string }[] = [];
    for (const g of grouped) for (const { sub } of g.subs) flatSubs.push({ id: sub.id });
    if (flatSubs.length === 0) return;

    const compute = () => {
      tickingRef.current = false;
      if (Date.now() < userJumpUntilRef.current) return;
      const trigger = SUPERMARKET_NAV.TOTAL + 16;
      let current = flatSubs[0].id;
      for (const { id } of flatSubs) {
        const el = sectionRefs.current[id];
        if (!el) continue;
        const top = el.getBoundingClientRect().top;
        if (top - trigger <= 0) current = id;
        else break;
      }
      setActiveSub((prev) => (prev === current ? prev : current));
    };

    const onScroll = () => {
      if (tickingRef.current) return;
      tickingRef.current = true;
      requestAnimationFrame(compute);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    compute();
    return () => window.removeEventListener("scroll", onScroll);
  }, [grouped]);

  // Auto-center active chips in their respective rails.
  useEffect(() => {
    mainBarRef.current
      ?.querySelector<HTMLButtonElement>(`[data-main="${activeGroup.id}"]`)
      ?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [activeGroup]);
  useEffect(() => {
    subBarRef.current
      ?.querySelector<HTMLButtonElement>(`[data-sub="${activeSub}"]`)
      ?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [activeSub]);

  const registerSectionRef = useCallback(
    (id: string) => (el: HTMLElement | null) => {
      sectionRefs.current[id] = el;
    },
    [],
  );

  const jumpToSub = useCallback((id: string) => {
    const el = sectionRefs.current[id];
    if (!el) return;
    setActiveSub(id);
    userJumpUntilRef.current = Date.now() + 700;
    const top = el.getBoundingClientRect().top + window.scrollY - SUPERMARKET_NAV.TOTAL;
    window.scrollTo({ top, behavior: "smooth" });
  }, []);

  const jumpToGroup = useCallback(
    (groupId: string) => {
      const g = grouped.find((x) => x.group.id === groupId);
      if (g?.subs[0]) jumpToSub(g.subs[0].sub.id);
    },
    [grouped, jumpToSub],
  );

  return {
    theme,
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
    isLoading,
  };
}
