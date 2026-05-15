/**
 * MainSearchHeader — Phase 11.1.
 *
 * Greeting + address now live in the global TopBar. This stem cell
 * is reduced to a *sticky* glass search bar that floats above the
 * feed as the user scrolls, gaining a subtle blur + border when
 * pinned. Exposes a search (right) + barcode (left) action.
 */
import { Search, ScanLine } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { SEARCH_PLACEHOLDERS } from "@/lib/personalize";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

export const MainSearchHeader = () => {
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const [pinned, setPinned] = useState(false);

  // Detect when the bar has stuck to the top via an IntersectionObserver
  // on a 1px sentinel placed just above it.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => setPinned(!entry.isIntersecting),
      { rootMargin: "-64px 0px 0px 0px", threshold: 0 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <>
      <div ref={sentinelRef} aria-hidden className="h-px w-full" />
      <section
        className={`sticky top-[calc(env(safe-area-inset-top)+56px)] z-30 -mx-4 px-4 py-1.5 transition-all duration-300 ease-apple ${
          pinned
            ? "bg-background/85 backdrop-blur-2xl border-b border-border/40 shadow-[0_1px_0_0_hsl(var(--border)/0.3)]"
            : "bg-transparent border-b border-transparent"
        }`}
      >
        <Link
          to="/search"
          search={{ q: "" }}
          className="flex h-10 w-full items-center gap-2 rounded-full bg-secondary/70 px-3.5 text-right ring-1 ring-border/30 shadow-[inset_0_1px_0_0_hsl(var(--background)/0.5),0_1px_2px_0_hsl(var(--foreground)/0.04)] transition active:scale-[0.99]"
          dir="rtl"
        >
          <Search className="h-4 w-4 text-muted-foreground" strokeWidth={2.4} />
          <span className="flex-1 truncate text-[13px] font-medium text-muted-foreground">
            {SEARCH_PLACEHOLDERS[0] ?? "ابحث في ريف المدينة…"}
          </span>
          <Button
            type="button"
            aria-label="مسح باركود"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              window.dispatchEvent(new CustomEvent("reef:open-barcode"));
            }}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary"
          >
            <ScanLine className="h-3.5 w-3.5" strokeWidth={2.6} />
          </Button>
        </Link>
      </section>
    </>
  );
};

export default MainSearchHeader;
