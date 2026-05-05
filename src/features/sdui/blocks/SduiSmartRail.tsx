/**
 * SduiSmartRail — horizontal Apple-Glass pill rail.
 * Supports `sticky` mode and in-page anchor scroll (when `to` starts with `#`).
 */
import { memo, useCallback } from "react";
import { Link } from "@tanstack/react-router";
import type { SduiRailBlock as Props } from "../engine/schemas";

const SduiSmartRailImpl = ({ block }: { block: Props }) => {
  const sticky = block.props.sticky === true;

  const onAnchorClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, hash: string) => {
      e.preventDefault();
      const id = hash.startsWith("#") ? hash.slice(1) : hash;
      const el = document.getElementById(id);
      if (el) {
        const y = el.getBoundingClientRect().top + window.scrollY - 96;
        window.scrollTo({ top: y, behavior: "smooth" });
      }
    },
    [],
  );

  return (
    <section
      className={
        sticky
          ? "sticky top-0 z-30 px-3 pt-2 pb-1 -mx-0 backdrop-blur-2xl bg-background/70 border-b border-border/30"
          : "px-3"
      }
    >
      {block.props.title && !sticky && (
        <h2 className="mb-2 px-1 font-display text-base font-extrabold tracking-tight text-foreground">
          {block.props.title}
        </h2>
      )}
      <div
        className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 snap-x snap-mandatory"
        style={{ scrollbarWidth: "none" }}
      >
        {block.props.items.map((item) => {
          const isHash = item.to.startsWith("#");
          const cls =
            "snap-start shrink-0 inline-flex items-center gap-1.5 rounded-full border border-border/40 bg-card/60 backdrop-blur-xl px-3 py-1.5 ring-1 ring-foreground/[0.04] transition ease-apple hover:bg-card/80 active:scale-[0.97]";
          if (isHash) {
            return (
              <a
                key={item.key}
                href={item.to}
                onClick={(e) => onAnchorClick(e, item.to)}
                className={cls}
              >
                {item.emoji && <span aria-hidden className="text-sm">{item.emoji}</span>}
                <span className="font-display text-[12px] font-bold text-foreground">
                  {item.title}
                </span>
              </a>
            );
          }
          return (
            <Link key={item.key} to={item.to} className={cls}>
              {item.emoji && <span aria-hidden className="text-sm">{item.emoji}</span>}
              <span className="font-display text-[12px] font-bold text-foreground">
                {item.title}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
};

export const SduiSmartRail = memo(SduiSmartRailImpl);
SduiSmartRail.displayName = "SduiSmartRail";
