// ProductGrid — virtualized window list of groups → subs → product rows.
// ----------------------------------------------------------------------
// Phase 23.1: replaces the previous nested `.map()` tree with a single
// flat row list rendered through `@tanstack/react-virtual`'s window
// virtualizer. We render only the rows currently inside the viewport
// (plus a small overscan), which keeps DOM nodes O(visible) instead of
// O(catalog) and protects mid-tier mobile from OOM at infinite-scroll
// scale.
//
// Row taxonomy:
//   • "group"    — gradient header tile for a top-level group
//   • "sub"      — section title for a subcategory (anchored ref host)
//   • "products" — a single horizontal row of N product cards (N = COLS)
//   • "sentinel" — IntersectionObserver target that triggers fetchNextPage
//
// Layout note: the rest of the page scrolls on `window`, so we use
// `useWindowVirtualizer` and absolutely position rows inside a relative
// container of total measured height. Each "products" row keeps the
// existing 2-col CSS grid so card styling and gaps are preserved.

import { memo, useEffect, useMemo, useRef } from "react";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import type { Product } from "@/lib/products";
import type { SupermarketGroup } from "../types";
import { SUPERMARKET_NAV } from "../types";
import { SupermarketProductCard } from "./SupermarketProductCard";

interface ProductGridProps {
  readonly grouped: ReadonlyArray<SupermarketGroup>;
  readonly registerSectionRef: (id: string) => (el: HTMLElement | null) => void;
  readonly hasNextPage?: boolean;
  readonly isFetchingNextPage?: boolean;
  readonly fetchNextPage?: () => void;
}

/** Cards per row in the legacy `grid-cols-2` layout. */
const COLS = 2;

/** Approximate measured heights (px). Virtualizer self-corrects with measureElement. */
const EST_GROUP_ROW = 64;
const EST_SUB_ROW = 40;
const EST_PRODUCTS_ROW = 280;
const EST_SENTINEL_ROW = 80;

type GridRow =
  | {
      readonly kind: "group";
      readonly key: string;
      readonly group: SupermarketGroup["group"];
    }
  | {
      readonly kind: "sub";
      readonly key: string;
      readonly subId: string;
      readonly subName: string;
      readonly count: number;
      readonly groupColor: SupermarketGroup["group"]["color"];
    }
  | {
      readonly kind: "products";
      readonly key: string;
      readonly subId: string;
      readonly items: ReadonlyArray<Product>;
    }
  | {
      readonly kind: "sentinel";
      readonly key: string;
    };

const flattenRows = (
  grouped: ReadonlyArray<SupermarketGroup>,
  withSentinel: boolean,
): ReadonlyArray<GridRow> => {
  const rows: GridRow[] = [];
  for (const g of grouped) {
    rows.push({ kind: "group", key: `g:${g.group.id}`, group: g.group });
    for (const { sub, items } of g.subs) {
      rows.push({
        kind: "sub",
        key: `s:${sub.id}`,
        subId: sub.id,
        subName: sub.name,
        count: items.length,
        groupColor: g.group.color,
      });
      for (let i = 0; i < items.length; i += COLS) {
        rows.push({
          kind: "products",
          key: `p:${sub.id}:${i}`,
          subId: sub.id,
          items: items.slice(i, i + COLS),
        });
      }
    }
  }
  if (withSentinel) rows.push({ kind: "sentinel", key: "sentinel" });
  return rows;
};

const estimateForKind = (kind: GridRow["kind"]): number => {
  switch (kind) {
    case "group":
      return EST_GROUP_ROW;
    case "sub":
      return EST_SUB_ROW;
    case "products":
      return EST_PRODUCTS_ROW;
    case "sentinel":
      return EST_SENTINEL_ROW;
  }
};

const ProductGridImpl = ({
  grouped,
  registerSectionRef,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
}: ProductGridProps) => {
  const parentRef = useRef<HTMLDivElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const rows = useMemo(
    () => flattenRows(grouped, Boolean(hasNextPage)),
    [grouped, hasNextPage],
  );

  const virtualizer = useWindowVirtualizer({
    count: rows.length,
    estimateSize: (index) => estimateForKind(rows[index].kind),
    overscan: 6,
    scrollMargin: parentRef.current?.offsetTop ?? 0,
    getItemKey: (index) => rows[index].key,
  });

  // Re-measure when row composition changes (catalog growth, search, etc.).
  useEffect(() => {
    virtualizer.measure();
  }, [rows, virtualizer]);

  // Infinite-scroll sentinel — observes the bottom row and triggers fetch.
  useEffect(() => {
    if (!hasNextPage || !fetchNextPage) return;
    const node = sentinelRef.current;
    if (!node) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && !isFetchingNextPage) {
            fetchNextPage();
            break;
          }
        }
      },
      { rootMargin: "600px 0px" },
    );
    io.observe(node);
    return () => io.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, rows.length]);

  if (grouped.length === 0) {
    return (
      <p className="rounded-2xl bg-foreground/5 p-6 text-center text-xs text-muted-foreground">
        لا توجد نتائج للبحث
      </p>
    );
  }

  const totalSize = virtualizer.getTotalSize();
  const items = virtualizer.getVirtualItems();
  const scrollMargin = virtualizer.options.scrollMargin;

  return (
    <div ref={parentRef} className="relative w-full" style={{ height: totalSize }}>
      {items.map((vi) => {
        const row = rows[vi.index];
        const top = vi.start - scrollMargin;
        const commonStyle: React.CSSProperties = {
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          transform: `translateY(${top}px)`,
        };

        if (row.kind === "group") {
          return (
            <div
              key={vi.key}
              ref={virtualizer.measureElement}
              data-index={vi.index}
              style={commonStyle}
            >
              <div className="pb-5">
                <div
                  className="rounded-2xl px-4 py-3 shadow-soft"
                  style={{
                    background: `linear-gradient(135deg, hsl(${row.group.color.tint}), hsl(${row.group.color.tint} / 0.6))`,
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-2xl" aria-hidden>
                      {row.group.emoji}
                    </span>
                    <h2
                      className="font-display text-lg font-extrabold"
                      style={{ color: `hsl(${row.group.color.hue})` }}
                    >
                      {row.group.name}
                    </h2>
                  </div>
                </div>
              </div>
            </div>
          );
        }

        if (row.kind === "sub") {
          return (
            <div
              key={vi.key}
              ref={virtualizer.measureElement}
              data-index={vi.index}
              style={commonStyle}
            >
              <section
                ref={registerSectionRef(row.subId)}
                style={{ scrollMarginTop: SUPERMARKET_NAV.TOTAL }}
              >
                <h3 className="mb-3 flex items-center gap-2 px-1 text-base font-extrabold text-foreground">
                  <span
                    className="inline-block h-3 w-1 rounded-full"
                    style={{ background: `hsl(${row.groupColor.hue})` }}
                  />
                  {row.subName}
                  <span className="text-[10px] font-medium text-muted-foreground">
                    · {row.count}
                  </span>
                </h3>
              </section>
            </div>
          );
        }

        if (row.kind === "products") {
          return (
            <div
              key={vi.key}
              ref={virtualizer.measureElement}
              data-index={vi.index}
              style={commonStyle}
            >
              <div className="grid grid-cols-2 gap-3 pb-3">
                {row.items.map((p) => (
                  <SupermarketProductCard
                    key={`${row.subId}-${p.id}`}
                    product={p}
                  />
                ))}
              </div>
            </div>
          );
        }

        // sentinel
        return (
          <div
            key={vi.key}
            ref={virtualizer.measureElement}
            data-index={vi.index}
            style={commonStyle}
          >
            <div
              ref={sentinelRef}
              className="flex items-center justify-center py-6 text-xs text-muted-foreground"
            >
              {isFetchingNextPage ? "جارِ التحميل…" : "اسحب لتحميل المزيد"}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export const ProductGrid = memo(ProductGridImpl);
ProductGrid.displayName = "ProductGrid";
