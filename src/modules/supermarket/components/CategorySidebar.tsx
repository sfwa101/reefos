// CategorySidebar — the dual sticky rail (main groups + sub categories).
// Kept fully presentational; all state and callbacks are injected.

import { memo } from "react";
import { supermarketTaxonomy } from "@/lib/supermarketTaxonomy";
import type { SupermarketGroup } from "../types";
import { SUPERMARKET_NAV } from "../types";

interface CategorySidebarProps {
  readonly grouped: ReadonlyArray<SupermarketGroup>;
  readonly activeGroup: SupermarketGroup["group"];
  readonly activeSub: string;
  readonly visibleSubs: ReadonlyArray<{ readonly id: string; readonly name: string }>;
  readonly mainBarRef: React.MutableRefObject<HTMLDivElement | null>;
  readonly subBarRef: React.MutableRefObject<HTMLDivElement | null>;
  readonly onJumpGroup: (groupId: string) => void;
  readonly onJumpSub: (id: string) => void;
}

const CategorySidebarImpl = ({
  grouped,
  activeGroup,
  activeSub,
  visibleSubs,
  mainBarRef,
  subBarRef,
  onJumpGroup,
  onJumpSub,
}: CategorySidebarProps) => {
  // Build the union of taxonomy + currently-grouped (handles ad-hoc groups).
  const seen = new Set<string>();
  const allGroups = [
    ...supermarketTaxonomy,
    ...grouped.map((x) => x.group),
  ].filter((g) => {
    if (seen.has(g.id)) return false;
    seen.add(g.id);
    return true;
  });

  return (
    <div
      className="fixed inset-x-0 z-30"
      style={{
        top: `${SUPERMARKET_NAV.HEADER_OFFSET + SUPERMARKET_NAV.HEADER_GAP}px`,
      }}
    >
      <div className="mx-auto max-w-md px-2">
        <div
          className="overflow-hidden rounded-[22px] ring-1 ring-border/40"
          style={{
            boxShadow:
              "0 12px 40px -18px rgba(0,0,0,0.22), 0 2px 8px -4px rgba(0,0,0,0.08)",
          }}
        >
          {/* Main rail */}
          <div
            className="px-3 pt-2.5 pb-2"
            style={{
              background: `hsl(var(--card) / 0.78)`,
              backdropFilter: "saturate(190%) blur(28px)",
              WebkitBackdropFilter: "saturate(190%) blur(28px)",
            }}
          >
            <div
              ref={mainBarRef}
              className="-mx-3 flex gap-1.5 overflow-x-auto px-3 no-scrollbar"
            >
              {allGroups.map((g) => {
                const isActive = g.id === activeGroup.id;
                const enabled = grouped.some((x) => x.group.id === g.id);
                return (
                  <button
                    key={g.id}
                    data-main={g.id}
                    onClick={() => enabled && onJumpGroup(g.id)}
                    disabled={!enabled}
                    type="button"
                    className={`shrink-0 inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[11.5px] font-extrabold transition-colors duration-150 active:scale-[0.97] touch-manipulation ${
                      enabled ? "" : "opacity-35"
                    } ${
                      isActive
                        ? "shadow-pill"
                        : "bg-foreground/5 text-foreground/80"
                    }`}
                    style={
                      isActive
                        ? {
                            background: `hsl(${g.color.tint})`,
                            color: `hsl(${g.color.hue})`,
                            boxShadow: `0 6px 18px -10px hsl(${g.color.hue} / 0.55)`,
                          }
                        : undefined
                    }
                  >
                    <span aria-hidden className="text-[13px] leading-none">
                      {g.emoji}
                    </span>
                    <span>{g.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sub rail */}
          <div
            className="px-3 py-2"
            style={{
              background: `hsl(var(--background) / 0.72)`,
              backdropFilter: "saturate(180%) blur(22px)",
              WebkitBackdropFilter: "saturate(180%) blur(22px)",
              borderTop: `1px solid hsl(${activeGroup.color.ring} / 0.25)`,
            }}
          >
            <div
              ref={subBarRef}
              className="-mx-3 flex gap-3 overflow-x-auto px-3 no-scrollbar"
            >
              {visibleSubs.length === 0 ? (
                <span className="py-1.5 text-[11px] text-muted-foreground">
                  لا توجد منتجات
                </span>
              ) : (
                visibleSubs.map((s) => {
                  const isActive = s.id === activeSub;
                  return (
                    <button
                      key={s.id}
                      data-sub={s.id}
                      type="button"
                      onClick={() => onJumpSub(s.id)}
                      className="relative shrink-0 py-1 text-[12px] font-bold transition-colors duration-150 active:scale-[0.97] touch-manipulation"
                      style={{
                        color: isActive
                          ? `hsl(${activeGroup.color.hue})`
                          : `hsl(var(--muted-foreground))`,
                      }}
                    >
                      {s.name}
                      <span
                        className="absolute -bottom-0.5 left-0 right-0 mx-auto h-[3px] w-3/4 rounded-full transition-all"
                        style={{
                          background: isActive
                            ? `hsl(${activeGroup.color.hue})`
                            : "transparent",
                        }}
                      />
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const CategorySidebar = memo(CategorySidebarImpl);
CategorySidebar.displayName = "CategorySidebar";
