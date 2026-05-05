/**
 * SduiSmartRail — horizontal scroll rail for compact entry points.
 * Apple Glass chips; no hard colors.
 */
import { memo } from "react";
import { Link } from "@tanstack/react-router";
import type { SduiRailBlock as Props } from "../engine/schemas";

const SduiSmartRailImpl = ({ block }: { block: Props }) => {
  return (
    <section className="px-3">
      {block.props.title && (
        <h2 className="mb-2 px-1 font-display text-base font-extrabold tracking-tight text-foreground">
          {block.props.title}
        </h2>
      )}
      <div
        className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 snap-x snap-mandatory"
        style={{ scrollbarWidth: "none" }}
      >
        {block.props.items.map((item) => (
          <Link
            key={item.key}
            to={item.to}
            className="snap-start shrink-0 inline-flex items-center gap-2 rounded-xl border border-border/40 bg-card/50 backdrop-blur-xl px-3.5 py-2.5 ring-1 ring-foreground/[0.04] transition ease-apple hover:bg-card/70 active:scale-[0.97]"
          >
            {item.emoji && (
              <span aria-hidden className="text-base">
                {item.emoji}
              </span>
            )}
            <span className="font-display text-[12.5px] font-bold text-foreground">
              {item.title}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
};

export const SduiSmartRail = memo(SduiSmartRailImpl);
SduiSmartRail.displayName = "SduiSmartRail";
