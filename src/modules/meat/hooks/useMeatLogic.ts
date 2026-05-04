import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  products,
  useProductsVersion,
  type Product,
} from "@/lib/products";
import { MEAT_GROUPS, groupOf } from "../constants";
import { NAV_OFFSETS, type MeatMainGroup } from "../types";

export interface MeatFeedSubSection {
  readonly id: string;
  readonly label: string;
  readonly items: ReadonlyArray<Product>;
}

export interface MeatFeedGroup extends MeatMainGroup {
  readonly items: ReadonlyArray<Product>;
  readonly subs: ReadonlyArray<MeatFeedSubSection>;
}

const { HEADER_OFFSET, TIER1, TIER2, TRIGGER } = NAV_OFFSETS;

/**
 * useMeatLogic — central hook for the Meat catalog page.
 *
 * Responsibilities:
 *  - Filter the global product catalog down to `source === "meat"` reactively
 *    (keyed off `useProductsVersion()` so realtime updates flow through).
 *  - Maintain `query` (search) state and derive the dual-tier feed.
 *  - Run the ScrollSpy that drives the active main group + active sub chip.
 *  - Provide imperative `jumpToGroup` / `jumpToSub` scroll helpers wired to
 *    refs registered by the page via `registerGroupRef` / `registerSectionRef`.
 *
 * NOTE on pricing: this page does NOT compute any prices inline. Per-product
 * price rendering is delegated to `<ProductCard>`. When the meat module is
 * later wired to `pricingEngine.calculate`, the integration point will be
 * inside `MeatProductCard` (or a future `useMeatLinePrice` hook) — not here.
 */
export function useMeatLogic() {
  // Reactive catalog: re-derive when the in-memory products cache mutates.
  const productsVersion = useProductsVersion();
  const meatProducts = useMemo<ReadonlyArray<Product>>(
    () => products.filter((p) => p.source === "meat"),
    // productsVersion is the trigger — `products` itself is a mutable module ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [productsVersion],
  );

  const [activeMain, setActiveMain] = useState<string>(MEAT_GROUPS[0].id);
  const [activeSub, setActiveSub] = useState<string>(MEAT_GROUPS[0].subs[0].id);
  const [scrolled, setScrolled] = useState<boolean>(false);
  const [query, setQuery] = useState<string>("");

  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const groupRefs = useRef<Record<string, HTMLElement | null>>({});
  const tier2Ref = useRef<HTMLDivElement | null>(null);

  const registerGroupRef = useCallback((id: string) => {
    return (el: HTMLElement | null): void => {
      groupRefs.current[id] = el;
    };
  }, []);

  const registerSectionRef = useCallback((id: string) => {
    return (el: HTMLElement | null): void => {
      sectionRefs.current[id] = el;
    };
  }, []);

  const currentGroup = useMemo<MeatMainGroup>(
    () => MEAT_GROUPS.find((g) => g.id === activeMain) ?? MEAT_GROUPS[0],
    [activeMain],
  );

  // ScrollSpy
  useEffect(() => {
    const onScroll = (): void => {
      setScrolled(window.scrollY > 8);
      const triggerY = HEADER_OFFSET + TIER1 + TIER2 + TRIGGER;

      let mainId: string = MEAT_GROUPS[0].id;
      for (const g of MEAT_GROUPS) {
        const el = groupRefs.current[g.id];
        if (!el) continue;
        const top = el.getBoundingClientRect().top;
        if (top - triggerY <= 0) mainId = g.id;
        else break;
      }
      setActiveMain((prev) => (prev !== mainId ? mainId : prev));

      const grp = MEAT_GROUPS.find((g) => g.id === mainId) ?? MEAT_GROUPS[0];
      let current: string = grp.subs[0].id;
      for (const s of grp.subs) {
        const el = sectionRefs.current[s.id];
        if (!el) continue;
        const top = el.getBoundingClientRect().top;
        if (top - triggerY <= 0) current = s.id;
        else break;
      }
      setActiveSub(current);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Auto-center active sub chip
  useEffect(() => {
    tier2Ref.current
      ?.querySelector<HTMLButtonElement>(`[data-sub="${activeSub}"]`)
      ?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [activeSub]);

  const jumpToSub = useCallback((id: string): void => {
    const el = sectionRefs.current[id];
    if (!el) return;
    const top =
      el.getBoundingClientRect().top + window.scrollY -
      (HEADER_OFFSET + TIER1 + TIER2 + 8);
    window.scrollTo({ top, behavior: "smooth" });
  }, []);

  const jumpToGroup = useCallback((id: string): void => {
    const el = groupRefs.current[id];
    if (!el) return;
    const top =
      el.getBoundingClientRect().top + window.scrollY -
      (HEADER_OFFSET + TIER1 + TIER2 + 8);
    window.scrollTo({ top, behavior: "smooth" });
  }, []);

  // Continuous feed: all groups → sub-sections → filtered items.
  const feed = useMemo<ReadonlyArray<MeatFeedGroup>>(() => {
    const q = query.trim();
    return MEAT_GROUPS.map((g) => {
      const items = meatProducts
        .filter((p) => groupOf(p.subCategory) === g.id)
        .filter((p) => !q || p.name.includes(q));
      const subs: MeatFeedSubSection[] = g.subs.map((s) => ({
        id: s.id,
        label: s.label,
        items: items.filter((p) =>
          s.id.startsWith("all-")
            ? true
            : (p.name + " " + (p.subCategory ?? "")).includes(s.id),
        ),
      }));
      return { ...g, items, subs };
    });
  }, [meatProducts, query]);

  return {
    // state
    activeMain,
    activeSub,
    scrolled,
    query,
    setQuery,
    // derived
    currentGroup,
    feed,
    // refs
    tier2Ref,
    registerGroupRef,
    registerSectionRef,
    // actions
    jumpToGroup,
    jumpToSub,
  } as const;
}
