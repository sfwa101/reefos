import { memo, type RefObject } from "react";
import { MEAT_GROUPS } from "../constants";
import { NAV_OFFSETS, type MeatMainGroup } from "../types";

interface Props {
  readonly activeMain: string;
  readonly activeSub: string;
  readonly scrolled: boolean;
  readonly currentGroup: MeatMainGroup;
  readonly themeHue: string;
  readonly tier2Ref: RefObject<HTMLDivElement | null>;
  readonly onJumpGroup: (id: string) => void;
  readonly onJumpSub: (id: string) => void;
}

const MeatStickyNavComponent = ({
  activeMain,
  activeSub,
  scrolled,
  currentGroup,
  themeHue,
  tier2Ref,
  onJumpGroup,
  onJumpSub,
}: Props) => (
  <div
    className="fixed inset-x-0 z-30"
    style={{ top: `${NAV_OFFSETS.HEADER_OFFSET}px` }}
  >
    <div
      className={`mx-auto max-w-md transition-shadow duration-300 ${
        scrolled ? "shadow-[0_8px_24px_-12px_rgba(0,0,0,0.18)]" : "shadow-none"
      }`}
      style={{
        background: `hsl(var(--card) / 0.96)`,
        backdropFilter: "saturate(180%) blur(24px)",
        WebkitBackdropFilter: "saturate(180%) blur(24px)",
        borderBottom: "1px solid hsl(var(--border) / 0.5)",
      }}
    >
      {/* Tier 1 — main groups */}
      <div className="grid grid-cols-4 gap-1 px-2 py-2">
        {MEAT_GROUPS.map((g) => {
          const active = g.id === activeMain;
          return (
            <button
              key={g.id}
              onClick={() => onJumpGroup(g.id)}
              className={`rounded-xl px-2 py-2 text-[11px] font-extrabold transition ease-apple ${
                active
                  ? "text-white shadow-pill"
                  : "bg-foreground/5 text-foreground"
              }`}
              style={active ? { background: `hsl(${themeHue})` } : undefined}
            >
              {g.name}
            </button>
          );
        })}
      </div>
      {/* Tier 2 — subcategories */}
      <div
        ref={tier2Ref}
        className="flex gap-2 overflow-x-auto border-t border-border/40 px-3 py-2 no-scrollbar"
      >
        {currentGroup.subs.map((s) => {
          const active = s.id === activeSub;
          return (
            <button
              key={s.id}
              data-sub={s.id}
              onClick={() => onJumpSub(s.id)}
              className={`shrink-0 rounded-full px-3.5 py-1 text-[11px] font-bold transition ease-apple ${
                active
                  ? "bg-foreground text-background shadow-pill"
                  : "bg-foreground/5 text-foreground"
              }`}
            >
              {s.label}
            </button>
          );
        })}
      </div>
    </div>
  </div>
);

export const MeatStickyNav = memo(MeatStickyNavComponent);
