/**
 * StickyTriLayerHub — universal stem-cell for any storefront's sticky
 * navigation. Three layers: search (optional), main groups rail, sub
 * categories rail. Apple-Glass surface with vivid accent ribbons.
 *
 * Pure presentational component — all state is injected. Replaces the
 * supermarket-specific CategorySidebar so every department can adopt
 * the same UX without duplicating layout logic.
 */
import { memo, type ReactNode } from "react";
import { Search } from "lucide-react";

export interface TriHubGroup {
  readonly id: string;
  readonly name: string;
  readonly emoji?: string;
  /** Optional accent — HSL components like "162 70% 38%". */
  readonly hue?: string;
  readonly tint?: string;
  readonly enabled?: boolean;
}

export interface TriHubSub {
  readonly id: string;
  readonly name: string;
}

export interface StickyTriLayerHubProps {
  readonly topOffset: number; // px from viewport top (below header)
  readonly groups: ReadonlyArray<TriHubGroup>;
  readonly subs: ReadonlyArray<TriHubSub>;
  readonly activeGroupId: string;
  readonly activeSubId: string;
  readonly onJumpGroup: (groupId: string) => void;
  readonly onJumpSub: (subId: string) => void;
  readonly mainBarRef?: React.MutableRefObject<HTMLDivElement | null>;
  readonly subBarRef?: React.MutableRefObject<HTMLDivElement | null>;
  /** Optional search input slot rendered as the top layer. */
  readonly searchSlot?: ReactNode;
  readonly searchValue?: string;
  readonly onSearchChange?: (value: string) => void;
  readonly searchPlaceholder?: string;
}

const StickyTriLayerHubImpl = ({
  topOffset,
  groups,
  subs,
  activeGroupId,
  activeSubId,
  onJumpGroup,
  onJumpSub,
  mainBarRef,
  subBarRef,
  searchSlot,
  searchValue,
  onSearchChange,
  searchPlaceholder,
}: StickyTriLayerHubProps) => {
  const activeGroup = groups.find((g) => g.id === activeGroupId);
  const accentHue = activeGroup?.hue ?? "var(--primary)";

  const renderedSearch = searchSlot ?? (onSearchChange ? (
    <div className="flex items-center gap-2 rounded-full bg-background/70 px-3 py-2 ring-1 ring-border/40">
      <Search className="h-4 w-4 text-muted-foreground" strokeWidth={2.4} />
      <input
        value={searchValue ?? ""}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder={searchPlaceholder ?? "ابحث…"}
        className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
      />
    </div>
  ) : null);

  return (
    <div className="fixed inset-x-0 z-30" style={{ top: `${topOffset}px` }}>
      <div className="mx-auto max-w-md px-2">
        <div
          className="overflow-hidden rounded-[22px] border border-border/40 ring-1 ring-foreground/[0.04]"
          style={{
            boxShadow:
              "0 12px 40px -18px hsl(var(--foreground) / 0.22), 0 2px 8px -4px hsl(var(--foreground) / 0.06)",
          }}
        >
          {/* Layer 1: search */}
          {renderedSearch && (
            <div
              className="px-3 pt-2.5 pb-2"
              style={{
                background: "hsl(var(--card) / 0.78)",
                backdropFilter: "saturate(190%) blur(28px)",
                WebkitBackdropFilter: "saturate(190%) blur(28px)",
              }}
            >
              {renderedSearch}
            </div>
          )}

          {/* Layer 2: main groups */}
          <div
            className="px-3 pt-2.5 pb-2"
            style={{
              background: "hsl(var(--card) / 0.72)",
              backdropFilter: "saturate(190%) blur(28px)",
              WebkitBackdropFilter: "saturate(190%) blur(28px)",
              borderTop: renderedSearch ? "1px solid hsl(var(--border) / 0.4)" : undefined,
            }}
          >
            <div
              ref={mainBarRef}
              className="-mx-3 flex gap-1.5 overflow-x-auto px-3 no-scrollbar"
            >
              {groups.map((g) => {
                const isActive = g.id === activeGroupId;
                const enabled = g.enabled ?? true;
                return (
                  <button
                    key={g.id}
                    data-main={g.id}
                    type="button"
                    onClick={() => enabled && onJumpGroup(g.id)}
                    disabled={!enabled}
                    className={`shrink-0 inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[11.5px] font-extrabold transition-colors duration-150 active:scale-[0.97] touch-manipulation ${
                      enabled ? "" : "opacity-35"
                    } ${isActive ? "shadow-pill" : "bg-foreground/5 text-foreground/80"}`}
                    style={
                      isActive && g.hue
                        ? {
                            background: `hsl(${g.tint ?? g.hue})`,
                            color: `hsl(${g.hue})`,
                            boxShadow: `0 6px 18px -10px hsl(${g.hue} / 0.55)`,
                          }
                        : undefined
                    }
                  >
                    {g.emoji && (
                      <span aria-hidden className="text-[13px] leading-none">
                        {g.emoji}
                      </span>
                    )}
                    <span>{g.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Layer 3: sub categories */}
          <div
            className="px-3 py-2"
            style={{
              background: "hsl(var(--background) / 0.72)",
              backdropFilter: "saturate(180%) blur(22px)",
              WebkitBackdropFilter: "saturate(180%) blur(22px)",
              borderTop: `1px solid hsl(${accentHue} / 0.22)`,
            }}
          >
            <div
              ref={subBarRef}
              className="-mx-3 flex gap-3 overflow-x-auto px-3 no-scrollbar"
            >
              {subs.length === 0 ? (
                <span className="py-1.5 text-[11px] text-muted-foreground">
                  لا توجد منتجات
                </span>
              ) : (
                subs.map((s) => {
                  const isActive = s.id === activeSubId;
                  return (
                    <button
                      key={s.id}
                      data-sub={s.id}
                      type="button"
                      onClick={() => onJumpSub(s.id)}
                      className="relative shrink-0 py-1 text-[12px] font-bold transition-colors duration-150 active:scale-[0.97] touch-manipulation"
                      style={{
                        color: isActive
                          ? `hsl(${accentHue})`
                          : "hsl(var(--muted-foreground))",
                      }}
                    >
                      {s.name}
                      <span
                        className="absolute -bottom-0.5 left-0 right-0 mx-auto h-[3px] w-3/4 rounded-full transition-all"
                        style={{
                          background: isActive ? `hsl(${accentHue})` : "transparent",
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

export const StickyTriLayerHub = memo(StickyTriLayerHubImpl);
StickyTriLayerHub.displayName = "StickyTriLayerHub";

export default StickyTriLayerHub;
