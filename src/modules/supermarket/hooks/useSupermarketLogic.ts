// useSupermarketLogic — single source of state for the Supermarket module.
// ----------------------------------------------------------------------
// Pilot migration (Phase 21.1): server-driven, paginated catalog via
// `usePagedProducts` (50 items / page). The legacy `ensureProductsLoaded`
// + global in-memory cache + Realtime subscription is no longer touched
// by this orchestrator. All filtering happens on the server when a search
// term is present; otherwise pages stream in via IntersectionObserver.

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePagedProducts } from "@/hooks/usePagedProducts";
import type { Product, ProductSource } from "@/lib/products";
import {
  groupBySupermarketTaxonomy,
  groupForSub,
  supermarketTaxonomy,
} from "@/lib/supermarketTaxonomy";
import { storeThemes } from "@/lib/storeThemes";
import type { SupermarketGroup } from "../types";
import { SUPERMARKET_NAV } from "../types";

// Verticals that DON'T belong to the supermarket grid.
const SUPERMARKET_EXCLUDED_SOURCES: ReadonlyArray<ProductSource> = [
  "wholesale",
  "kitchen",
  "recipes",
  "restaurants",
  "sweets",
  "baskets",
  "village",
  "library",
];

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
  readonly isFetchingNextPage: boolean;
  readonly hasNextPage: boolean;
  /** Attach to a sentinel <div /> at the bottom of the feed. */
  readonly loadMoreRef: (el: HTMLElement | null) => void;
}

export function useSupermarketLogic(): UseSupermarketLogicResult {
  const theme = storeThemes.supermarket;

  // ── Search (debounced for server-side ilike) ─────────────────────
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 250);
    return () => clearTimeout(t);
  }, [query]);

  // ── Paginated catalog (server-side filter + range) ───────────────
  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = usePagedProducts({
    excludeSources: SUPERMARKET_EXCLUDED_SOURCES,
    q: debouncedQuery || undefined,
  });

  const pool = useMemo<Product[]>(
    () => (data?.pages.flatMap((p) => p.items) ?? []),
    [data],
  );

  const [activeSub, setActiveSub] = useState<string>("");

  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const mainBarRef = useRef<HTMLDivElement | null>(null);
  const subBarRef = useRef<HTMLDivElement | null>(null);
  const tickingRef = useRef(false);
  const userJumpUntilRef = useRef(0);

  // Note: `groupBySupermarketTaxonomy` already accepts a query parameter for
  // client-side narrowing; we pass an empty string because the server has
  // already filtered when `debouncedQuery` is present.
  const grouped = useMemo<ReadonlyArray<SupermarketGroup>>(() => {
    console.time("TaxonomyGrouping");
    const result = groupBySupermarketTaxonomy(pool, "") as SupermarketGroup[];
    console.timeEnd("TaxonomyGrouping");
    console.debug("[Supermarket] pool size:", pool.length, "groups:", result.length);
    return result;
  }, [pool]);

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

  // ── Scrollspy — throttled to 150ms to avoid layout thrashing on long feeds
  useEffect(() => {
    const flatSubs: { id: string }[] = [];
    for (const g of grouped) for (const { sub } of g.subs) flatSubs.push({ id: sub.id });
    if (flatSubs.length === 0) return;

    let lastRun = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const THROTTLE_MS = 150;

    const compute = () => {
      lastRun = Date.now();
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
      const now = Date.now();
      const elapsed = now - lastRun;
      if (elapsed >= THROTTLE_MS) {
        if (tickingRef.current) return;
        tickingRef.current = true;
        requestAnimationFrame(compute);
      } else if (!timer) {
        timer = setTimeout(() => {
          timer = null;
          if (tickingRef.current) return;
          tickingRef.current = true;
          requestAnimationFrame(compute);
        }, THROTTLE_MS - elapsed);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    compute();
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (timer) clearTimeout(timer);
    };
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

  // ── IntersectionObserver sentinel for infinite scroll ────────────
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useCallback(
    (el: HTMLElement | null) => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
      if (!el) return;
      observerRef.current = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
              console.debug("[Supermarket] sentinel hit → fetchNextPage()");
              void fetchNextPage();
            }
          }
        },
        { rootMargin: "200px 0px" },
      );
      observerRef.current.observe(el);
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage],
  );

  useEffect(() => () => observerRef.current?.disconnect(), []);

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
    isFetchingNextPage,
    hasNextPage: Boolean(hasNextPage),
    loadMoreRef,
  };
}
