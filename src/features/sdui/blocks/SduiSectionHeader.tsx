/**
 * SduiSectionHeader — colored pill heading used to break the supermarket
 * hub into named sections (خضار، ألبان، …).
 */
import { memo } from "react";
import type { SduiSectionHeaderBlock as Props } from "../engine/schemas";

const TONE_BG: Record<string, string> = {
  emerald: "from-emerald-500/25 to-emerald-500/5 text-emerald-800 dark:text-emerald-200",
  rose:    "from-rose-500/25 to-rose-500/5 text-rose-800 dark:text-rose-200",
  amber:   "from-amber-500/25 to-amber-500/5 text-amber-800 dark:text-amber-200",
  violet:  "from-violet-500/25 to-violet-500/5 text-violet-800 dark:text-violet-200",
  sky:     "from-sky-500/25 to-sky-500/5 text-sky-800 dark:text-sky-200",
  teal:    "from-teal-500/25 to-teal-500/5 text-teal-800 dark:text-teal-200",
  orange:  "from-orange-500/25 to-orange-500/5 text-orange-800 dark:text-orange-200",
  pink:    "from-pink-500/25 to-pink-500/5 text-pink-800 dark:text-pink-200",
  lime:    "from-lime-500/25 to-lime-500/5 text-lime-800 dark:text-lime-200",
  indigo:  "from-indigo-500/25 to-indigo-500/5 text-indigo-800 dark:text-indigo-200",
  fuchsia: "from-fuchsia-500/25 to-fuchsia-500/5 text-fuchsia-800 dark:text-fuchsia-200",
  graphite:"from-foreground/[0.10] to-foreground/[0.02] text-foreground",
};

const SduiSectionHeaderImpl = ({ block }: { block: Props }) => {
  const cls = TONE_BG[block.props.tone ?? "graphite"] ?? TONE_BG.graphite;
  return (
    <section id={block.props.anchor} className="px-3 pt-2 scroll-mt-24">
      <div
        className={`flex items-center gap-2 rounded-2xl bg-gradient-to-br px-4 py-3 shadow-soft backdrop-blur-xl ${cls}`}
      >
        {block.props.emoji && (
          <span aria-hidden className="text-2xl">
            {block.props.emoji}
          </span>
        )}
        <h2 className="font-display text-lg font-extrabold tracking-tight">
          {block.props.title}
        </h2>
      </div>
    </section>
  );
};

export const SduiSectionHeader = memo(SduiSectionHeaderImpl);
SduiSectionHeader.displayName = "SduiSectionHeader";
