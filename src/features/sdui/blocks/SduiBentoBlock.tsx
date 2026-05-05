/**
 * SduiBentoBlock — Apple Glass + Vibrant Mesh Gradient bento grid.
 * Sizes: wide (col-span-2), tall (row-span-2), half (1×1), full (col-span-3).
 * Tones map to tokenized gradient surfaces; motifs add layered SVG depth.
 */
import { memo } from "react";
import { Link } from "@tanstack/react-router";
import type { SduiBentoBlock as Props } from "../engine/schemas";

const SIZE_CLASS: Record<"wide" | "tall" | "half" | "full", string> = {
  wide: "col-span-2 row-span-1 min-h-[124px]",
  tall: "col-span-1 row-span-2 min-h-[256px]",
  half: "col-span-1 row-span-1 min-h-[120px]",
  full: "col-span-3 row-span-1 min-h-[124px]",
};

type Tone = NonNullable<NonNullable<Props["props"]["items"][number]["tone"]>>;

// Vibrant mesh-style gradients. Pure Tailwind tokens with arbitrary HSL —
// matches the Apple Glass + colorful aesthetic.
const TONE_GRADIENT: Record<Tone, string> = {
  emerald: "from-emerald-500/35 via-emerald-400/15 to-teal-500/25",
  rose:    "from-rose-500/35 via-pink-400/15 to-fuchsia-500/25",
  amber:   "from-amber-500/40 via-orange-400/20 to-yellow-500/25",
  violet:  "from-violet-500/35 via-purple-400/15 to-indigo-500/25",
  sky:     "from-sky-500/35 via-cyan-400/15 to-blue-500/25",
  teal:    "from-teal-500/35 via-cyan-400/15 to-emerald-500/25",
  orange:  "from-orange-500/40 via-red-400/15 to-amber-500/25",
  pink:    "from-pink-500/35 via-rose-400/15 to-red-500/25",
  lime:    "from-lime-500/35 via-green-400/15 to-emerald-500/25",
  indigo:  "from-indigo-500/35 via-blue-400/15 to-violet-500/25",
  fuchsia: "from-fuchsia-500/35 via-pink-400/15 to-purple-500/25",
  graphite:"from-foreground/[0.08] via-foreground/[0.03] to-foreground/[0.01]",
};

const TONE_GLOW: Record<Tone, string> = {
  emerald: "bg-emerald-400/40",
  rose:    "bg-rose-400/40",
  amber:   "bg-amber-400/45",
  violet:  "bg-violet-400/40",
  sky:     "bg-sky-400/40",
  teal:    "bg-teal-400/40",
  orange:  "bg-orange-400/45",
  pink:    "bg-pink-400/40",
  lime:    "bg-lime-400/40",
  indigo:  "bg-indigo-400/40",
  fuchsia: "bg-fuchsia-400/40",
  graphite:"bg-primary/20",
};

type Motif = "mesh" | "rings" | "grid" | "glow" | "wave";

function MotifLayer({ motif }: { motif: Motif }) {
  switch (motif) {
    case "rings":
      return (
        <svg aria-hidden className="pointer-events-none absolute inset-0 h-full w-full opacity-40 mix-blend-overlay" viewBox="0 0 100 100" preserveAspectRatio="none">
          <circle cx="80" cy="20" r="22" fill="none" stroke="currentColor" strokeWidth="0.4" className="text-foreground" />
          <circle cx="80" cy="20" r="14" fill="none" stroke="currentColor" strokeWidth="0.4" className="text-foreground" />
          <circle cx="80" cy="20" r="7" fill="none" stroke="currentColor" strokeWidth="0.4" className="text-foreground" />
        </svg>
      );
    case "grid":
      return (
        <svg aria-hidden className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.18]" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <pattern id="g" width="10" height="10" patternUnits="userSpaceOnUse">
              <path d="M10 0H0V10" fill="none" stroke="currentColor" strokeWidth="0.3" className="text-foreground" />
            </pattern>
          </defs>
          <rect width="100" height="100" fill="url(#g)" />
        </svg>
      );
    case "wave":
      return (
        <svg aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 w-full opacity-50 mix-blend-overlay" viewBox="0 0 100 50" preserveAspectRatio="none">
          <path d="M0 30 Q 25 10 50 30 T 100 30 V 50 H 0 Z" fill="currentColor" className="text-foreground/30" />
          <path d="M0 38 Q 25 22 50 38 T 100 38 V 50 H 0 Z" fill="currentColor" className="text-foreground/20" />
        </svg>
      );
    case "glow":
      return null; // base layer already provides the glow blob
    case "mesh":
    default:
      return (
        <>
          <div aria-hidden className="pointer-events-none absolute -bottom-8 -left-8 h-28 w-28 rounded-full bg-foreground/[0.06] blur-2xl" />
          <div aria-hidden className="pointer-events-none absolute top-1/2 -right-6 h-20 w-20 rounded-full bg-foreground/[0.08] blur-2xl" />
        </>
      );
  }
}

const SduiBentoBlockImpl = ({ block }: { block: Props }) => {
  return (
    <section className="px-3">
      {block.props.title && (
        <h2 className="mb-3 px-1 font-display text-lg font-extrabold tracking-tight text-foreground">
          {block.props.title}
        </h2>
      )}
      <div className="grid grid-cols-3 auto-rows-[120px] gap-3">
        {block.props.items.map((item) => {
          const tone: Tone = item.tone ?? "graphite";
          const motif: Motif = item.motif ?? "mesh";
          return (
            <Link
              key={item.key}
              to={item.to}
              className={`group relative flex flex-col justify-end overflow-hidden rounded-3xl border border-border/40 bg-gradient-to-br ${TONE_GRADIENT[tone]} backdrop-blur-xl ring-1 ring-foreground/[0.04] shadow-[0_8px_24px_-12px_hsl(var(--foreground)/0.18)] transition ease-apple hover:-translate-y-0.5 hover:shadow-[0_14px_36px_-14px_hsl(var(--foreground)/0.28)] active:scale-[0.97] ${SIZE_CLASS[item.size]}`}
            >
              <div
                aria-hidden
                className={`pointer-events-none absolute -top-8 -right-8 h-28 w-28 rounded-full ${TONE_GLOW[tone]} blur-3xl opacity-70 group-hover:opacity-100 transition`}
              />
              <MotifLayer motif={motif} />

              <div className="relative z-10 p-3.5">
                {item.emoji && (
                  <div className="mb-2 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-background/55 backdrop-blur-md ring-1 ring-border/50 text-2xl shadow-sm">
                    <span aria-hidden>{item.emoji}</span>
                  </div>
                )}
                <p className="font-display text-[13.5px] font-extrabold text-foreground drop-shadow-sm">
                  {item.title}
                </p>
                {item.subtitle && (
                  <p className="mt-0.5 text-[11px] font-medium text-foreground/70">
                    {item.subtitle}
                  </p>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
};

export const SduiBentoBlock = memo(SduiBentoBlockImpl);
SduiBentoBlock.displayName = "SduiBentoBlock";
