import { Link } from "@tanstack/react-router";
import { ScanBarcode, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

/**
 * StickySearchBar — Phase 11.6.
 * Sticks FLUSH under the fixed TopBar (top-14) with a full-width glass
 * surface that ALWAYS paints the background — never a transparent strip —
 * so product cards never bleed through behind the pill while scrolling.
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
        // Sticks flush under the fixed TopBar (h-14 ≈ top-14). The wrapper
        // ALWAYS carries the glass surface (no transparent gap above the pill);
        // on scroll we just deepen the blur + add a hairline shadow.
        "sticky top-14 z-30 -mx-4 mb-6 px-4 pb-3 pt-3 transition-[background-color,backdrop-filter,box-shadow] duration-300",
        scrolled
          ? "bg-background/90 shadow-[0_1px_0_0_hsl(var(--border)/0.6)] backdrop-blur-xl"
          : "bg-background/85 backdrop-blur-md",
      ].join(" ")}
    >
      <div
        className="flex h-12 items-center gap-2 rounded-full bg-secondary/60 px-2 ring-1 ring-border/40"
        dir="rtl"
      >
        <Link
          to="/search" search={{ q: "" }}
          aria-label="بحث"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition active:scale-[0.95]"
        >
          <Search className="h-5 w-5" strokeWidth={2.2} />
        </Link>
        <Link
          to="/search" search={{ q: "" }}
          className="flex-1 truncate text-[13.5px] font-medium text-muted-foreground"
        >
          ابحث عن منتج، قسم، أو ماركة…
        </Link>
        <Button
          type="button"
          aria-label="مسح باركود"
          onClick={() => window.dispatchEvent(new CustomEvent("reef:open-barcode"))}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary transition active:scale-[0.95]"
        >
          <ScanBarcode className="h-5 w-5" strokeWidth={2.2} />
        </Button>
      </div>
    </div>
  );
};

export default StickySearchBar;
