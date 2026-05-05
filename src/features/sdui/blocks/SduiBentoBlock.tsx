/**
 * SduiBentoBlock — Pixel-perfect restoration of the legacy departments hub
 * tiles. When the JSON `motif` is one of the canonical MotifIds (village,
 * supermarket, …), we render the legacy `MeshBg` + `MotifIcon` palette so
 * the new SDUI engine looks identical to the older hand-coded screen.
 *
 * Falls back to abstract motifs (mesh / rings / grid / glow / wave) +
 * `tone` gradients when the JSON intentionally requests them.
 */
import { memo, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import type { SduiBentoBlock as Props } from "../engine/schemas";
import {
  MeshBg,
  MotifIcon,
  motifInk,
  motifChip,
  type MotifId,
} from "@/components/sections/MeshTile";

const SIZE_CLASS: Record<"wide" | "tall" | "half" | "full", string> = {
  // Phase 18.04 — Zero-gap protocol: all tiles share row-span-1.
  // `tall` is intentionally collapsed to `half` to eliminate vertical gaps.
  wide: "col-span-2 row-span-1 min-h-[128px]",
  tall: "col-span-1 row-span-1 min-h-[128px]",
  half: "col-span-1 row-span-1 min-h-[128px]",
  full: "col-span-3 row-span-1 min-h-[140px]",
};

type Tone = NonNullable<NonNullable<Props["props"]["items"][number]["tone"]>>;
type RawMotif = NonNullable<NonNullable<Props["props"]["items"][number]["motif"]>>;
type AbstractMotif = "mesh" | "rings" | "grid" | "glow" | "wave";

const ABSTRACT_MOTIFS: ReadonlySet<string> = new Set<AbstractMotif>([
  "mesh", "rings", "grid", "glow", "wave",
]);

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

function AbstractOverlay({ motif }: { motif: AbstractMotif }) {
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
        </svg>
      );
    case "glow":
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
      <div className="grid grid-cols-3 grid-flow-row-dense gap-4">
        {block.props.items.map((item) => {
          const rawMotif: RawMotif | undefined = item.motif;
          const isAbstract = !rawMotif || ABSTRACT_MOTIFS.has(rawMotif);
          const motifId = (!isAbstract ? rawMotif : undefined) as MotifId | undefined;
          const tone: Tone = item.tone ?? "graphite";

          let bg: ReactNode;
          let icon: ReactNode = null;
          let inkStyle: React.CSSProperties = {};
          let chipStyle: React.CSSProperties = {};

          if (motifId) {
            bg = (
              <>
                <MeshBg motif={motifId} />
                <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-black/[0.04]" />
              </>
            );
            icon = (
              <MotifIcon motif={motifId} className="h-7 w-7" />
            );
            inkStyle = { color: motifInk(motifId) };
            chipStyle = { background: motifChip(motifId) };
          } else {
            bg = (
              <>
                <div className={`absolute inset-0 bg-gradient-to-br ${TONE_GRADIENT[tone]}`} />
                <AbstractOverlay motif={(rawMotif ?? "mesh") as AbstractMotif} />
              </>
            );
          }

          return (
            <Link
              key={item.key}
              to={item.to}
              className={`group relative flex flex-col justify-end overflow-hidden rounded-[1.4rem] border border-border/40 ring-1 ring-foreground/[0.04] shadow-[0_6px_18px_-12px_hsl(var(--foreground)/0.22)] transition ease-apple hover:-translate-y-0.5 hover:shadow-[0_12px_28px_-14px_hsl(var(--foreground)/0.30)] active:scale-[0.97] ${SIZE_CLASS[item.size]}`}
              style={inkStyle}
            >
              {bg}

              <div className="relative z-10 flex h-full flex-col justify-between p-3">
                {icon ? (
                  <div
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl shadow-sm ring-1 ring-foreground/[0.06]"
                    style={chipStyle}
                  >
                    {icon}
                  </div>
                ) : item.emoji ? (
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-background/55 backdrop-blur-md ring-1 ring-border/50 text-xl shadow-sm">
                    <span aria-hidden>{item.emoji}</span>
                  </div>
                ) : <span />}

                <div>
                  <p className="font-display text-[13.5px] font-extrabold leading-tight drop-shadow-sm">
                    {item.title}
                  </p>
                  {item.subtitle && (
                    <p className="mt-0.5 text-[11px] font-medium opacity-80">
                      {item.subtitle}
                    </p>
                  )}
                </div>
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
