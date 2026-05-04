/**
 * CheckoutSheet — Step 2 of the Two-Step Zen Checkout (Phase 12.7).
 *
 * The cart page (Step 1) stays focused on item review + address. All money,
 * promo, tip, guest-fields and the final WhatsApp submit live here, behind
 * a single bottom-sheet so the user makes one decision at a time.
 */
import { AnimatePresence, motion } from "framer-motion";
import { Check, Loader2, Lock, MessageCircle, Tag } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { fmtMoney, toLatin } from "@/lib/format";
import type { useCartOrchestrator } from "../hooks/useCartOrchestrator";
import { CartPaymentMethods } from "./CartPaymentMethods";
import { CartSummary } from "./CartSummary";
import { CartLogisticsBanners } from "./CartLogisticsBanners";
import { NumberFlow } from "./NumberFlow";
import { useTipPresets } from "../hooks/useTipPresets";

type O = ReturnType<typeof useCartOrchestrator>;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  o: O;
  hasPricingErrors: boolean;
  isLocked: boolean;
};

export const CheckoutSheet = ({ open, onOpenChange, o, hasPricingErrors, isLocked }: Props) => {
  const tipPresets = useTipPresets(o.subtotal);

  const blockedMessage = (() => {
    if (isLocked) return "السلة مقفلة بانتظار موافقات المشاركين";
    if (hasPricingErrors) return "يوجد منتجات تحتاج إلى استكمال بياناتها";
    if (o.logisticsBlocked)
      return o.logisticsQuote?.blockers[0]?.message ?? "لا يمكن إتمام الطلب — راجع تفاصيل التوصيل";
    return null;
  })();

  const onSubmit = () => {
    if (blockedMessage) {
      toast.error(blockedMessage);
      return;
    }
    void o.checkoutWA();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[92vh] overflow-y-auto rounded-t-3xl border-t-0 p-0"
      >
        <SheetHeader className="sticky top-0 z-10 border-b border-border/40 bg-background/95 px-4 py-3 backdrop-blur">
          <SheetTitle className="text-right font-display text-base font-extrabold">
            إتمام الطلب
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4 px-4 pb-32 pt-4" dir="rtl">
          <CartLogisticsBanners quote={o.logisticsQuote} />

          <CartPaymentMethods o={o} />

          {/* Promo */}
          <motion.div
            layout
            className={`overflow-hidden rounded-2xl bg-card shadow-[0_4px_18px_-8px_rgba(0,0,0,0.1)] ring-1 transition ${
              o.appliedPromo ? "ring-primary/40" : "ring-border/30"
            }`}
          >
            <div className="flex items-center gap-2 p-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-primary/10 text-primary">
                <Tag className="h-4 w-4" />
              </div>
              <input
                value={o.promo}
                onChange={(e) => o.setPromo(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && o.applyPromo()}
                placeholder="كود الخصم (REEF10، WELCOME25)"
                className="flex-1 bg-transparent text-sm font-bold outline-none"
              />
              <button
                onClick={o.applyPromo}
                className={`rounded-[10px] px-4 py-2 text-xs font-extrabold transition ${
                  o.appliedPromo ? "bg-primary text-primary-foreground" : "bg-foreground text-background"
                }`}
              >
                {o.appliedPromo ? <Check className="h-4 w-4" /> : "تطبيق"}
              </button>
            </div>
            <AnimatePresence>
              {o.appliedPromo && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-t border-primary/15 bg-primary/5 px-3 py-2"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-extrabold text-primary">🎉 وفّرت اليوم</p>
                    <p className="font-display text-base font-extrabold text-primary">
                      <NumberFlow value={o.discount} /> ج.م
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Tip — dynamic presets (5/10/15% of subtotal) */}
          <div className="rounded-2xl bg-card p-4 shadow-[0_4px_18px_-8px_rgba(0,0,0,0.1)] ring-1 ring-border/30">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-bold">إكرامية المندوب 💚</p>
              <span className="text-xs font-extrabold text-primary tabular-nums">
                {o.tip > 0 ? fmtMoney(o.tip) : "اختياري"}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {tipPresets.map((t) => {
                const active = o.tip === t.amount;
                return (
                  <motion.button
                    whileTap={{ scale: 0.94 }}
                    key={`${t.amount}-${t.label}`}
                    onClick={() => o.setTip(t.amount)}
                    className={`relative rounded-[12px] py-2.5 text-[11px] font-extrabold transition tabular-nums ${
                      active
                        ? "bg-gradient-to-br from-primary to-[hsl(150_55%_38%)] text-primary-foreground shadow-[0_6px_18px_-6px_hsl(150_60%_40%/0.55)]"
                        : "bg-foreground/5"
                    }`}
                  >
                    {t.label}
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Guest checkout fields */}
          {!o.user && (
            <section className="space-y-3 rounded-2xl bg-card p-4 ring-1 ring-border/40">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-display text-sm font-extrabold">إتمام الطلب كضيف</p>
                  <p className="text-[11px] text-muted-foreground">
                    أو{" "}
                    <Link to="/auth" className="font-bold text-primary underline">
                      سجّل الدخول
                    </Link>{" "}
                    لحفظ طلباتك
                  </p>
                </div>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-extrabold text-primary">
                  سريع
                </span>
              </div>
              <div className="space-y-2">
                <input
                  type="text"
                  value={o.guestName}
                  onChange={(e) => o.setGuestName(e.target.value)}
                  placeholder="الاسم بالكامل"
                  maxLength={80}
                  className="w-full rounded-xl bg-foreground/5 px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                />
                <input
                  type="tel"
                  inputMode="tel"
                  value={o.guestPhone}
                  onChange={(e) => o.setGuestPhone(e.target.value)}
                  placeholder="رقم الهاتف"
                  maxLength={20}
                  className="w-full rounded-xl bg-foreground/5 px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                />
                <textarea
                  value={o.guestAddress}
                  onChange={(e) => o.setGuestAddress(e.target.value)}
                  placeholder="عنوان التوصيل بالتفصيل"
                  maxLength={300}
                  rows={2}
                  className="w-full rounded-xl bg-foreground/5 px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
            </section>
          )}

          <CartSummary
            subtotal={o.subtotal}
            discount={o.discount}
            appliedPromo={o.appliedPromo}
            delivery={o.effectiveDelivery}
            billSavings={o.billSavings}
            tip={o.tip}
            isSplit={o.isSplit}
            walletApplied={o.walletApplied}
            walletShortfall={o.walletShortfall}
            secondaryLabel={o.secondaryLabel}
            grand={o.effectiveGrand}
          />
        </div>

        {/* Sticky submit — single unified guard */}
        <div
          className="fixed inset-x-0 bottom-0 z-20 border-t border-border/40 bg-background/95 px-3 py-3 backdrop-blur"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 0.75rem)" }}
        >
          <button
            type="button"
            onClick={onSubmit}
            disabled={o.submitting || blockedMessage !== null}
            className="flex w-full items-center justify-between gap-3 rounded-2xl bg-primary px-4 py-3.5 font-extrabold text-primary-foreground shadow-[0_10px_30px_-10px_hsl(var(--primary)/0.55)] transition disabled:cursor-not-allowed disabled:bg-foreground/30 disabled:text-foreground/60"
          >
            <span className="flex items-center gap-2">
              {o.submitting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : blockedMessage ? (
                <Lock className="h-5 w-5" />
              ) : (
                <MessageCircle className="h-5 w-5" />
              )}
              <span className="text-sm">
                {blockedMessage
                  ? blockedMessage.length > 40
                    ? `${blockedMessage.slice(0, 38)}…`
                    : blockedMessage
                  : o.submitting
                    ? "جاري إرسال طلبك..."
                    : "إتمام عبر واتساب"}
              </span>
            </span>
            <span className="rounded-[12px] bg-primary-foreground/15 px-3 py-1.5 text-sm font-extrabold tabular-nums">
              {toLatin(Math.round(o.effectiveGrand))} ج
            </span>
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
