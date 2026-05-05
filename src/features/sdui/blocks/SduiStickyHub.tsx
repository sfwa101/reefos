/**
 * SduiStickyHub — 3-layer sticky header for store hubs.
 * Layer 1: main department pills (jump to anchor)
 * Layer 2: sub-category small pills for the active main section
 * Layer 3: search bar
 *
 * Sticks under the app top bar (offset configurable via CSS var).
 * Active section is determined by IntersectionObserver on anchored sections.
 */
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import type { SduiStickyHubBlock as Props } from "../engine/schemas";

const TONE_PILL: Record<string, string> = {
  emerald: "bg-emerald-500 text-white",
  rose: "bg-rose-500 text-white",
  amber: "bg-amber-500 text-amber-950",
  violet: "bg-violet-500 text-white",
  sky: "bg-sky-500 text-white",
  teal: "bg-teal-500 text-white",
  orange: "bg-orange-500 text-white",
  pink: "bg-pink-500 text-white",
  lime: "bg-lime-500 text-lime-950",
  indigo: "bg-indigo-500 text-white",
  fuchsia: "bg-fuchsia-500 text-white",
  graphite: "bg-foreground text-background",
};

const STICKY_TOP = 0; // Sheet's parent already accounts for the page header.
const SCROLL_OFFSET = 220; // total sticky stack ~ pills + subs + search

function smoothScrollTo(anchor: string) {
  const el = document.getElementById(anchor);
  if (!el) return;
  const y = el.getBoundingClientRect().top + window.scrollY - SCROLL_OFFSET + 8;
  window.scrollTo({ top: y, behavior: "smooth" });
}

const SduiStickyHubImpl = ({ block }: { block: Props }) => {
  const { sections, search_placeholder } = block.props;
  const [activeKey, setActiveKey] = useState<string>(sections[0]?.key ?? "");
  const [query, setQuery] = useState("");
  const mainBarRef = useRef<HTMLDivElement | null>(null);

  const allAnchors = useMemo(() => {
    return sections.flatMap((s) => [
      { key: s.key, anchor: s.anchor, mainKey: s.key },
      ...(s.subs ?? []).map((sub) => ({
        key: sub.key,
        anchor: sub.anchor,
        mainKey: s.key,
      })),
    ]);
  }, [sections]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const observed: HTMLElement[] = [];
    const map = new Map<string, string>(); // anchor -> mainKey
    allAnchors.forEach((a) => map.set(a.anchor, a.mainKey));

    const obs = new IntersectionObserver(
      (entries) => {
        // Pick the entry closest to the top viewport.
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) {
          const main = map.get(visible.target.id);
          if (main) setActiveKey(main);
        }
      },
      { rootMargin: `-${SCROLL_OFFSET}px 0px -55% 0px`, threshold: 0 },
    );

    allAnchors.forEach((a) => {
      const el = document.getElementById(a.anchor);
      if (el) {
        obs.observe(el);
        observed.push(el);
      }
    });
    return () => {
      observed.forEach((el) => obs.unobserve(el));
      obs.disconnect();
    };
  }, [allAnchors]);

  const activeSection = sections.find((s) => s.key === activeKey) ?? sections[0];
  const subs = activeSection?.subs ?? [];

  const onSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const q = query.trim();
      if (!q) return;
      // Soft jump: try to find a section title matching query
      const match = sections.find((s) => s.title.includes(q));
      if (match) smoothScrollTo(match.anchor);
    },
    [query, sections],
  );

  return (
    <div
      className="sticky z-40 -mx-0 border-b border-border/40 bg-background/85 backdrop-blur-2xl"
      style={{ top: STICKY_TOP }}
    >
      {/* Layer 1 — Main pills */}
      <div ref={mainBarRef} className="overflow-x-auto px-3 pt-2" style={{ scrollbarWidth: "none" }}>
        <div className="flex gap-2 pb-2">
          {sections.map((s) => {
            const active = s.key === activeKey;
            const tone = TONE_PILL[s.tone ?? "graphite"] ?? TONE_PILL.graphite;
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => smoothScrollTo(s.anchor)}
                className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 font-display text-[12px] font-extrabold transition ease-apple ${
                  active
                    ? `${tone} shadow-soft`
                    : "bg-card/70 text-foreground/80 ring-1 ring-foreground/[0.06]"
                }`}
              >
                {s.emoji && <span aria-hidden>{s.emoji}</span>}
                {s.title}
              </button>
            );
          })}
        </div>
      </div>

      {/* Layer 2 — Sub-category icons (only when active section has subs) */}
      {subs.length > 0 && (
        <div className="overflow-x-auto px-3 border-t border-border/20" style={{ scrollbarWidth: "none" }}>
          <div className="flex gap-1.5 py-1.5">
            {subs.map((sub) => (
              <button
                key={sub.key}
                type="button"
                onClick={() => smoothScrollTo(sub.anchor)}
                className="shrink-0 inline-flex items-center gap-1 rounded-full bg-muted/40 px-2.5 py-1 text-[11px] font-bold text-foreground/75 ring-1 ring-foreground/[0.04] transition ease-apple hover:bg-muted/60 active:scale-[0.97]"
              >
                {sub.emoji && <span aria-hidden className="text-[12px]">{sub.emoji}</span>}
                {sub.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Layer 3 — Search */}
      <form onSubmit={onSubmit} className="px-3 pb-2 pt-1">
        <label className="flex items-center gap-2 rounded-full border border-border/40 bg-card/80 px-3 py-1.5 ring-1 ring-foreground/[0.04] focus-within:ring-2 focus-within:ring-primary/40">
          <Search className="h-4 w-4 text-muted-foreground" strokeWidth={2.4} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={search_placeholder ?? "ابحث عن منتج…"}
            className="flex-1 bg-transparent text-[13px] font-medium text-foreground outline-none placeholder:text-muted-foreground"
          />
        </label>
      </form>
    </div>
  );
};

export const SduiStickyHub = memo(SduiStickyHubImpl);
SduiStickyHub.displayName = "SduiStickyHub";
