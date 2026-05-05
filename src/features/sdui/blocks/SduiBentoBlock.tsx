/**
 * SduiBentoBlock — Apple Glass bento grid.
 * Sizes: wide (col-span-2), tall (row-span-2), half (1×1), full (col-span-3).
 * All surfaces use backdrop-blur + tokenized borders/text — no hard colors.
 */
import { memo } from "react";
import { Link } from "@tanstack/react-router";
import type { SduiBentoBlock as Props } from "../engine/schemas";

const SIZE_CLASS: Record<"wide" | "tall" | "half" | "full", string> = {
  wide: "col-span-2 row-span-1 min-h-[120px]",
  tall: "col-span-1 row-span-2 min-h-[244px]",
  half: "col-span-1 row-span-1 min-h-[112px]",
  full: "col-span-3 row-span-1 min-h-[120px]",
};

const SduiBentoBlockImpl = ({ block }: { block: Props }) => {
  return (
    <section className="px-3">
      {block.props.title && (
        <h2 className="mb-3 px-1 font-display text-lg font-extrabold tracking-tight text-foreground">
          {block.props.title}
        </h2>
      )}
      <div className="grid grid-cols-3 auto-rows-[112px] gap-3">
        {block.props.items.map((item) => (
          <Link
            key={item.key}
            to={item.to}
            className={`group relative flex flex-col justify-end overflow-hidden rounded-3xl border border-border/40 bg-card/40 backdrop-blur-xl ring-1 ring-foreground/[0.03] transition ease-apple hover:-translate-y-0.5 hover:bg-card/60 active:scale-[0.97] ${SIZE_CLASS[item.size]}`}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute -top-6 -right-6 h-24 w-24 rounded-full bg-primary/10 blur-2xl opacity-60"
            />
            <div className="relative z-10 p-3.5">
              {item.emoji && (
                <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-background/60 backdrop-blur-md ring-1 ring-border/40 text-xl">
                  <span aria-hidden>{item.emoji}</span>
                </div>
              )}
              <p className="font-display text-[13px] font-extrabold text-foreground">
                {item.title}
              </p>
              {item.subtitle && (
                <p className="mt-0.5 text-[10.5px] font-medium text-muted-foreground">
                  {item.subtitle}
                </p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
};

export const SduiBentoBlock = memo(SduiBentoBlockImpl);
SduiBentoBlock.displayName = "SduiBentoBlock";
