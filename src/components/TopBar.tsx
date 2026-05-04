import { Link } from "@tanstack/react-router";
import { Check, ChevronDown, MapPin, ShoppingBag } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { useCartTotal } from "@/context/CartContext";
import { useLocation as useDeliveryLocation } from "@/context/LocationContext";
import { toLatin } from "@/lib/format";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import type { ZoneId } from "@/lib/geoZones";

/**
 * Smart, edge-to-edge header — Phase 11.6.
 *
 * Right (RTL → visually right): location pill that opens a BottomSheet
 *   for instant zone switching. We never navigate away from the shopping
 *   surface — `ChevronDown` now matches behaviour (sheet, not page jump).
 * Left  (RTL → visually left): cart capsule. Icon pinned to the visually-
 *   left edge; the compact-notated total expands inline to its right.
 *
 * Compact notation: long EGP totals (15,500) blow out the capsule on small
 * screens. `Intl.NumberFormat('en-US', { notation: 'compact' })` renders
 * `15.5K`, capping width at ~96px regardless of basket size. We keep the
 * label currency-free here — the capsule is a glance signal, full pricing
 * lives on the cart page.
 */

const compactFmt = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const fmtCompact = (n: number) => toLatin(compactFmt.format(Math.round(n)));

const TopBar = () => {
  const total = useCartTotal();
  const { zone, zones, setZoneId } = useDeliveryLocation();
  const [zoneSheetOpen, setZoneSheetOpen] = useState(false);

  const expanded = total > 0;

  const onPickZone = (id: ZoneId) => {
    setZoneId(id);
    setZoneSheetOpen(false);
  };

  return (
    <>
      <header
        className="fixed inset-x-0 top-0 z-40 bg-background/80 backdrop-blur-xl"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="mx-auto flex h-14 w-full max-w-md items-center justify-between gap-3 px-4 lg:max-w-[1400px] lg:px-6">
          {/* Right side (RTL): location pill — opens Sheet, NOT a page jump */}
          <button
            type="button"
            onClick={() => setZoneSheetOpen(true)}
            aria-label="تغيير المنطقة"
            aria-haspopup="dialog"
            aria-expanded={zoneSheetOpen}
            className="inline-flex h-11 min-h-[44px] items-center gap-1.5 rounded-full bg-secondary/60 px-3 text-[13px] font-medium text-foreground ring-1 ring-border/40 transition active:scale-[0.97]"
          >
            <MapPin className="h-4 w-4 text-primary" strokeWidth={2.4} />
            <span className="font-bold">المنزل</span>
            <span className="text-muted-foreground">،</span>
            <span className="text-muted-foreground">{zone.shortName}</span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={2.4} />
          </button>

          {/* Left side (RTL): smart cart capsule — icon LEFT, compact total RIGHT */}
          <Link
            to="/cart"
            aria-label="السلة"
            className="relative inline-flex h-11 min-w-11 items-center justify-start overflow-hidden rounded-full bg-primary/10 text-primary backdrop-blur-md ring-1 ring-primary/15 transition active:scale-[0.97]"
            dir="ltr"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center">
              <ShoppingBag className="h-5 w-5" strokeWidth={2.2} />
            </span>
            <AnimatePresence initial={false}>
              {expanded && (
                <motion.span
                  key="amount"
                  initial={{ width: 0, opacity: 0, marginRight: 0, paddingRight: 0 }}
                  animate={{ width: "auto", opacity: 1, marginRight: 2, paddingRight: 14 }}
                  exit={{ width: 0, opacity: 0, marginRight: 0, paddingRight: 0 }}
                  transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden whitespace-nowrap font-display text-sm font-bold tabular-nums"
                >
                  {fmtCompact(total)}
                </motion.span>
              )}
            </AnimatePresence>
          </Link>
        </div>
      </header>

      {/* Quick-zone Sheet — keeps the user inside the shopping flow */}
      <Sheet open={zoneSheetOpen} onOpenChange={setZoneSheetOpen}>
        <SheetContent
          side="bottom"
          className="rounded-t-[28px] border-t-0 px-4 pb-6 pt-5"
          dir="rtl"
        >
          <SheetHeader className="text-right">
            <SheetTitle className="font-display text-lg font-extrabold">
              منطقة التوصيل
            </SheetTitle>
            <SheetDescription className="text-[12px] text-muted-foreground">
              اختر منطقتك لعرض الأسعار، الرسوم، ووقت التوصيل بدقة.
            </SheetDescription>
          </SheetHeader>

          <ul className="mt-4 flex flex-col gap-1.5">
            {zones.map((z) => {
              const active = z.id === zone.id;
              return (
                <li key={z.id}>
                  <button
                    type="button"
                    onClick={() => onPickZone(z.id)}
                    className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-right transition active:scale-[0.99] ${
                      active
                        ? "bg-primary text-primary-foreground shadow-pill"
                        : "bg-card text-foreground ring-1 ring-border/60"
                    }`}
                  >
                    <span className="flex flex-col">
                      <span className="font-display text-[14px] font-extrabold">
                        {z.shortName}
                      </span>
                      <span
                        className={`text-[11px] ${
                          active ? "text-primary-foreground/80" : "text-muted-foreground"
                        }`}
                      >
                        {z.name}
                      </span>
                    </span>
                    {active && <Check className="h-4 w-4" strokeWidth={2.6} />}
                  </button>
                </li>
              );
            })}
          </ul>

          <Link
            to="/account/addresses"
            onClick={() => setZoneSheetOpen(false)}
            className="mt-4 flex h-11 items-center justify-center rounded-full bg-secondary/70 text-[12.5px] font-bold text-foreground ring-1 ring-border/50"
          >
            إدارة عناويني الكاملة
          </Link>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default TopBar;
