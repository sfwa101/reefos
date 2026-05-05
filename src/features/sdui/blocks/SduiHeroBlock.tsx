/**
 * SduiHeroBlock — Apple Glass hero header.
 * Pure tokens; no hard-coded colors. Backdrop-blur + translucent layer.
 */
import { memo } from "react";
import type { SduiHeroBlock as Props } from "../engine/schemas";

const TONE_BG: Record<NonNullable<Props["props"]["tone"]>, string> = {
  graphite: "from-foreground/[0.04] to-foreground/[0.01]",
  sand:     "from-amber-500/10 to-transparent",
  ocean:    "from-sky-500/10 to-transparent",
  rose:     "from-rose-500/10 to-transparent",
};

const SduiHeroBlockImpl = ({ block }: { block: Props }) => {
  const tone = block.props.tone ?? "graphite";
  return (
    <section
      className={`relative overflow-hidden rounded-3xl border border-border/40 bg-gradient-to-br ${TONE_BG[tone]} backdrop-blur-xl px-5 py-6 mx-3`}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -top-10 -right-10 h-40 w-40 rounded-full bg-primary/10 blur-3xl"
      />
      <h1 className="font-display text-2xl font-extrabold tracking-tight text-foreground">
        {block.props.title}
      </h1>
      {block.props.subtitle && (
        <p className="mt-1 text-[13px] text-muted-foreground">{block.props.subtitle}</p>
      )}
    </section>
  );
};

export const SduiHeroBlock = memo(SduiHeroBlockImpl);
SduiHeroBlock.displayName = "SduiHeroBlock";
