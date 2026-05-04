import { Link } from "@tanstack/react-router";
import { ScanBarcode, Search } from "lucide-react";
import { useEffect, useState } from "react";

/**
 * StickySearchBar — Phase 11.5.
 * Pinned just below the fixed TopBar (top-16). On scroll, the bar lifts onto
 * a glass surface (backdrop-blur + translucent bg + soft shadow) so it floats
 * elegantly above the product feed.
 */
const StickySearchBar = () => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={[
        "sticky top-16 z-30 -mx-4 mb-6 mt-4 px-4 transition-[background,backdrop-filter,box-shadow] duration-300",
        scrolled ? "bg-background/80 shadow-sm backdrop-blur-xl" : "bg-transparent",
      ].join(" ")}
    >
      <div
        className="flex h-12 items-center gap-2 rounded-full bg-secondary/50 px-2 ring-1 ring-border/40"
        dir="rtl"
      >
        <Link
          to="/search"
          aria-label="بحث"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition active:scale-[0.95]"
        >
          <Search className="h-5 w-5" strokeWidth={2.2} />
        </Link>
        <Link
          to="/search"
          className="flex-1 truncate text-[13.5px] font-medium text-muted-foreground"
        >
          ابحث عن منتج، قسم، أو ماركة…
        </Link>
        <button
          type="button"
          aria-label="مسح باركود"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary transition active:scale-[0.95]"
        >
          <ScanBarcode className="h-5 w-5" strokeWidth={2.2} />
        </button>
      </div>
    </div>
  );
};

export default StickySearchBar;
