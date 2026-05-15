import { Link } from "@tanstack/react-router";
import { Check, MapPin, Menu, Plus, ShoppingBag } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useCartTotal } from "@/core/orders/runtime/react/CartProvider";
import { useLocationStatic as useDeliveryLocation } from "@/context/LocationContext";
import { useAuth } from "@/context/AuthContext";
import { LogisticsGateway, type SavedAddressVM } from "@/core/logistics";
import { toLatin } from "@/lib/format";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import AddressSheet from "@/apps/reef-al-madina/features/logistics/components/AddressSheet";

/**
 * TopBar — Phase 26 (Sovereign Minimalism).
 *
 * Three-zone layout: cart (left) · centered address pill · hamburger (right).
 * The persona switcher has moved to /account. Address pill shows ONLY the
 * dynamic address (e.g. "المنزل، جمصة"); no static "اختر عنوان" placeholder.
 */

const compactFmt = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const fmtCompact = (n: number) => toLatin(compactFmt.format(Math.round(n)));

type SavedAddress = SavedAddressVM;

const TopBar = () => {
  const total = useCartTotal();
  const { zone, setFromAddress } = useDeliveryLocation();
  const { user } = useAuth();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [addrSheetOpen, setAddrSheetOpen] = useState(false);
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  const expanded = total > 0;

  const loadAddresses = async () => {
    if (!user) { setAddresses([]); return; }
    const list = await LogisticsGateway.listAddresses(user.id);
    setAddresses(list);
    const def = list.find((a) => a.is_default) ?? list[0];
    if (def) {
      setActiveId(def.id);
      setFromAddress(def.city, def.district);
    }
  };

  useEffect(() => { loadAddresses(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [user?.id]);

  const onPickAddress = (a: SavedAddress) => {
    setActiveId(a.id);
    setFromAddress(a.city, a.district);
    setPickerOpen(false);
  };

  const activeAddress = addresses.find((a) => a.id === activeId);
  const addressText = activeAddress
    ? `${activeAddress.label}، ${zone.shortName}`
    : zone.shortName;

  return (
    <>
      <header
        className="fixed inset-x-0 top-0 z-40 bg-background/80 backdrop-blur-xl"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div dir="ltr" className="mx-auto grid h-14 w-full max-w-md grid-cols-[auto_1fr_auto] items-center gap-2 px-4 lg:max-w-[1400px] lg:px-6">
          {/* LEFT — Cart */}
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
                  className="overflow-hidden whitespace-nowrap font-display text-[15px] font-extrabold tabular-nums tracking-tight"
                >
                  {fmtCompact(total)}
                </motion.span>
              )}
            </AnimatePresence>
          </Link>

          {/* CENTER — Address Pill (dynamic only) */}
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            aria-label="تغيير عنوان التوصيل"
            aria-haspopup="dialog"
            aria-expanded={pickerOpen}
            className="mx-auto inline-flex h-11 min-h-[44px] max-w-full items-center gap-1.5 truncate rounded-full bg-secondary/60 px-4 text-[13px] font-bold text-foreground ring-1 ring-border/40 transition active:scale-[0.97]"
          >
            <MapPin className="h-4 w-4 text-primary" strokeWidth={2.4} />
            <span className="truncate">{addressText}</span>
          </button>

          {/* RIGHT — Hamburger → /account */}
          <Link
            to="/account"
            aria-label="القائمة"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-secondary/60 text-foreground ring-1 ring-border/40 transition active:scale-[0.97]"
          >
            <Menu className="h-5 w-5" strokeWidth={2.2} />
          </Link>
        </div>
      </header>

      {/* Addresses picker */}
      <Sheet open={pickerOpen} onOpenChange={setPickerOpen}>
        <SheetContent
          side="bottom"
          className="rounded-t-[28px] border-t-0 px-4 pb-6 pt-5"
          dir="rtl"
        >
          <SheetHeader className="text-right">
            <SheetTitle className="font-display text-lg font-extrabold">
              عنوان التوصيل
            </SheetTitle>
            <SheetDescription className="text-[12px] text-muted-foreground">
              اختر عنواناً محفوظاً أو أضف عنواناً جديداً على الخريطة.
            </SheetDescription>
          </SheetHeader>

          {!user ? (
            <div className="mt-4 space-y-3 rounded-2xl bg-foreground/[0.04] p-4 text-center">
              <p className="text-sm font-bold">سجّل الدخول لحفظ عناوينك</p>
              <Link
                to="/auth"
                onClick={() => setPickerOpen(false)}
                className="inline-flex h-10 items-center justify-center rounded-full bg-primary px-5 text-xs font-extrabold text-primary-foreground"
              >
                تسجيل الدخول
              </Link>
            </div>
          ) : (
            <>
              <ul className="mt-4 max-h-[50vh] space-y-2 overflow-y-auto">
                {addresses.length === 0 ? (
                  <li className="rounded-2xl bg-foreground/[0.04] p-4 text-center text-xs text-muted-foreground">
                    لا توجد عناوين محفوظة بعد.
                  </li>
                ) : (
                  addresses.map((a) => {
                    const active = a.id === activeId;
                    return (
                      <li key={a.id}>
                        <button
                          type="button"
                          onClick={() => onPickAddress(a)}
                          className={`flex w-full items-start justify-between gap-2 rounded-2xl px-4 py-3 text-right transition active:scale-[0.99] ${
                            active
                              ? "bg-primary text-primary-foreground shadow-pill"
                              : "bg-card text-foreground ring-1 ring-border/60"
                          }`}
                        >
                          <span className="flex flex-col">
                            <span className="font-display text-[14px] font-extrabold">{a.label}</span>
                            <span
                              className={`line-clamp-1 text-[11px] ${
                                active ? "text-primary-foreground/80" : "text-muted-foreground"
                              }`}
                            >
                              {[a.street, a.district, a.city].filter(Boolean).join("، ")}
                            </span>
                          </span>
                          {active && <Check className="mt-1 h-4 w-4 shrink-0" strokeWidth={2.6} />}
                        </button>
                      </li>
                    );
                  })
                )}
              </ul>

              <button
                type="button"
                onClick={() => { setPickerOpen(false); setAddrSheetOpen(true); }}
                className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-full bg-primary text-[12.5px] font-extrabold text-primary-foreground"
              >
                <Plus className="h-4 w-4" strokeWidth={2.6} /> عنوان جديد على الخريطة
              </button>
            </>
          )}
        </SheetContent>
      </Sheet>

      <AddressSheet
        open={addrSheetOpen}
        onOpenChange={(v) => {
          setAddrSheetOpen(v);
          if (!v) loadAddresses();
        }}
        onSaved={(id) => { setActiveId(id); loadAddresses(); }}
      />
    </>
  );
};

export default TopBar;
