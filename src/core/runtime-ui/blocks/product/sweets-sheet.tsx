import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Info, ShoppingBag, Star } from "lucide-react";
import { useCart } from "@/core/orders/runtime/react/CartProvider";
import { toast } from "sonner";
import { fmtMoney, toLatin } from "@/lib/format";
import { fireMiniConfetti } from "@/lib/confetti";
import type { Product } from "@/core/catalog/legacyProduct.types";
import {
  buildBookingDays,
  bookingTimeSlots,
  fulfillmentMeta,
  fulfillmentTypeFor,
  formatBookingShort,
  formatBookingDate,
  DEPOSIT_PCT,
  DEPOSIT_THRESHOLD,
} from "@/core/commerce/variants/custom-fulfillment-rules";
import { sweetsBookingToModifiers } from "@/lib/pricingAdapters";
import { mod, type Modifier } from "@/lib/pricingEngine";
import { VariantPicker } from "@/apps/reef-al-madina/features/custom-fulfillment/components/VariantPicker";
import { FulfillmentSelector } from "@/core/runtime-ui/blocks/commerce/fulfillment-selector";
import { SweetsCustomizationForm } from "@/apps/reef-al-madina/features/custom-fulfillment/components/SweetsCustomizationForm";

type Props = {
  product: Product;
  open: boolean;
  onClose: () => void;
};

/**
 * Orchestrator for the sweets product sheet. Owns state + pricing math and
 * delegates pure UI to VariantPicker / FulfillmentSelector / CustomizationForm.
 * No business logic was changed in this refactor.
 */
const SweetsProductSheet = ({ product, open, onClose }: Props) => {
  const { add } = useCart();
  const fType = fulfillmentTypeFor(product.id, product.subCategory);
  const fMeta = fulfillmentMeta[fType];
  const isBooking = fType === "C";

  // Stabilize identity — `product.variants ?? []` creates a NEW array on every
  // render which previously triggered the reset-effect repeatedly → infinite
  // setState loop ("Maximum update depth exceeded" white-screen crash).
  const variants = useMemo(() => product.variants ?? [], [product.variants]);
  const addons = useMemo(() => product.addons ?? [], [product.addons]);

  const [variantId, setVariantId] = useState<string>(variants[0]?.id ?? "");
  const [addonIds, setAddonIds] = useState<string[]>([]);
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState("");

  // Booking-only state
  const days = useMemo(() => buildBookingDays(7), []);
  const [dayIdx, setDayIdx] = useState(0);
  const [slot, setSlot] = useState<string>(bookingTimeSlots[1].id);
  const [shipMode, setShipMode] = useState<"split" | "wait">("split");
  const [payDeposit, setPayDeposit] = useState<boolean>(true);

  // Reset on each open. Depend ONLY on `open` + product id; the `variants`
  // identity is unstable across renders and would re-fire this effect.
  useEffect(() => {
    if (!open) return;
    setVariantId(variants[0]?.id ?? "");
    setAddonIds([]);
    setQty(1);
    setNote("");
    setDayIdx(0);
    setSlot(bookingTimeSlots[1].id);
    setShipMode("split");
    setPayDeposit(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, product.id]);

  const variantDelta = variants.find((v) => v.id === variantId)?.priceDelta ?? 0;
  const addonsSum = addons
    .filter((a) => addonIds.includes(a.id))
    .reduce((s, a) => s + a.price, 0);
  const unitPrice = product.price + variantDelta + addonsSum;
  const lineTotal = unitPrice * qty;

  // Deposit math (only meaningful when isBooking)
  const depositRequired = isBooking && lineTotal >= DEPOSIT_THRESHOLD;
  const effectivePayDeposit = isBooking && (depositRequired || payDeposit);
  const depositAmount = isBooking ? Math.round(lineTotal * DEPOSIT_PCT) : 0;
  const remainderOnDelivery =
    effectivePayDeposit && lineTotal > 0 ? lineTotal - depositAmount : 0;

  const toggleAddon = (id: string) =>
    setAddonIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const confirm = () => {
    const date = days[dayIdx];
    // Stem-cell modifiers (Phase 2): variant delta + addons + booking deposit.
    const mods: Modifier[] = [];
    if (variantDelta) {
      mods.push(mod.variant(`variant:${variantId}`, "متغيّر", variantDelta));
    }
    for (const a of addons.filter((x) => addonIds.includes(x.id))) {
      mods.push(mod.addon(`addon:${a.id}`, a.label, a.price));
    }
    if (isBooking) {
      mods.push(
        ...sweetsBookingToModifiers({
          bookingSubtotal: lineTotal,
          depositPct: DEPOSIT_PCT,
          threshold: effectivePayDeposit ? 0 : DEPOSIT_THRESHOLD,
        }),
      );
    }
    add(product, qty, {
      variantId: variantId || undefined,
      addonIds: addonIds.length ? addonIds : undefined,
      unitPrice,
      appliedModifiers: mods,
      bookingDate: isBooking ? date.toISOString().slice(0, 10) : undefined,
      bookingSlot: isBooking ? slot : undefined,
      bookingNote: note.trim() || undefined,
      payDeposit: isBooking ? effectivePayDeposit : undefined,
      shipMode: isBooking ? shipMode : undefined,
    });
    fireMiniConfetti();
    toast.success(
      isBooking
        ? `تم حجز ${product.name} ليوم ${formatBookingShort(date)} 🎂`
        : `تمت إضافة ${product.name} إلى السلة`,
    );
    onClose();
  };

  // Lock body scroll while the sheet is open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center"
        >
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            onClick={(e) => e.stopPropagation()}
            className="relative max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-[28px] bg-card shadow-float ring-1 ring-border/40 sm:rounded-[28px]"
          >
            {/* Hero */}
            <div className="relative h-48 w-full overflow-hidden">
              <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-card via-card/30 to-transparent" />
              <button
                onClick={onClose}
                aria-label="إغلاق"
                className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-background/90 text-foreground shadow-pill"
              >
                <X className="h-4 w-4" />
              </button>
              <span className={`absolute left-3 top-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-extrabold ${fMeta.badgeBg} ${fMeta.badgeText} shadow-pill`}>
                {fMeta.emoji} {fMeta.badge}
              </span>
              <div className="absolute inset-x-4 bottom-3 flex items-end justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="font-display text-xl font-extrabold leading-tight text-foreground">{product.name}</h2>
                  <p className="text-[11px] text-muted-foreground">{product.unit}</p>
                </div>
                {product.rating && (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-foreground/85 px-2 py-1 text-[10px] font-extrabold text-background">
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                    {toLatin(product.rating)}
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-4 p-4">
              {/* Description */}
              <div className={`rounded-2xl p-3 ring-1 ${
                isBooking ? "bg-violet-500/10 ring-violet-500/20" : "bg-foreground/5 ring-border/40"
              }`}>
                <p className="flex items-start gap-2 text-[12px] font-bold leading-relaxed text-foreground">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-600" />
                  {fMeta.description}
                </p>
              </div>

              <VariantPicker
                variants={variants}
                addons={addons}
                variantId={variantId}
                addonIds={addonIds}
                onVariantChange={setVariantId}
                onToggleAddon={toggleAddon}
              />

              {isBooking && (
                <FulfillmentSelector
                  days={days}
                  dayIdx={dayIdx}
                  onDayChange={setDayIdx}
                  slot={slot}
                  onSlotChange={setSlot}
                  shipMode={shipMode}
                  onShipModeChange={setShipMode}
                  depositRequired={depositRequired}
                  effectivePayDeposit={effectivePayDeposit}
                  depositAmount={depositAmount}
                  remainderOnDelivery={remainderOnDelivery}
                  lineTotal={lineTotal}
                  onPayDepositChange={setPayDeposit}
                />
              )}

              <SweetsCustomizationForm
                note={note}
                onNoteChange={setNote}
                qty={qty}
                onQtyChange={setQty}
                isBooking={isBooking}
              />

              {/* Summary (booking only) */}
              {isBooking && (
                <div className="rounded-2xl bg-gradient-to-br from-violet-50 to-violet-100/50 p-3 ring-1 ring-violet-200 dark:from-violet-500/10 dark:to-violet-500/5 dark:ring-violet-500/20">
                  <p className="mb-1 text-[10px] font-bold text-muted-foreground">موعد الاستلام</p>
                  <p className="text-sm font-extrabold text-violet-700 dark:text-violet-300">
                    {formatBookingDate(days[dayIdx])} — {bookingTimeSlots.find((s) => s.id === slot)?.label}
                  </p>
                </div>
              )}
            </div>

            {/* Sticky CTA */}
            <div
              className="sticky bottom-0 border-t border-border/40 bg-card/95 p-3"
              style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 0.75rem)" }}
            >
              {isBooking && effectivePayDeposit && (
                <div className="mb-2 flex items-center justify-between rounded-[12px] bg-violet-500/10 px-3 py-1.5 text-[10px] font-extrabold text-violet-700 dark:text-violet-300">
                  <span>عربون الآن</span>
                  <span className="tabular-nums">{fmtMoney(depositAmount)}</span>
                </div>
              )}
              <button
                onClick={confirm}
                className="flex w-full items-center justify-between gap-3 rounded-[18px] bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-3.5 font-extrabold text-white shadow-[0_10px_30px_-10px_rgba(124,58,237,0.55)] transition active:scale-[0.98]"
              >
                <span className="flex items-center gap-2 text-sm">
                  <ShoppingBag className="h-5 w-5" />
                  {isBooking ? "تأكيد الحجز" : "أضف إلى السلة"}
                </span>
                <span className="rounded-[12px] bg-white/15 px-3 py-1.5 text-sm tabular-nums">
                  {fmtMoney(lineTotal)}
                </span>
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
};

export default SweetsProductSheet;
