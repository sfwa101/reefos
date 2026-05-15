/**
 * CheckoutSheet — Step 2 of the Two-Step Zen Checkout.
 *
 * Phase 12.8 additions:
 *  - Gift Mode toggle (disables COD, hides invoice, optional gift message)
 *  - Smart Fakka Engine: Team Bonus rail + Charity rail (interlocked totals)
 *  - 3/4 + 1/4 sticky CTA (submit + Home shortcut)
 */
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Gift, Home, Loader2, Lock, MessageCircle, Tag } from "lucide-react";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { toLatin } from "@/lib/format";
import { computeCheckoutRails, computeChargeableAmount } from "@/core/orders";
import type { useCartOrchestrator } from "../hooks/useCartOrchestrator";
import { CartPaymentMethods } from "./CartPaymentMethods";
import { CartSummary } from "./CartSummary";
import { CartLogisticsBanners } from "./CartLogisticsBanners";
import { NumberFlow } from "./NumberFlow";
import { SmartFakkaRail } from "./SmartFakkaRail";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type O = ReturnType<typeof useCartOrchestrator>;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  o: O;
  hasPricingErrors: boolean;
  isLocked: boolean;
};

const CHARITY_CAUSES = [
  { id: "food", label: "إطعام الفقراء 🍞" },
  { id: "hospitals", label: "دعم المستشفيات 🏥" },
  { id: "orphans", label: "كفالة الأيتام 👶" },
  { id: "general", label: "صندوق الخير العام ❤" },
] as const;

export const CheckoutSheet = ({ open, onOpenChange, o, hasPricingErrors, isLocked }: Props) => {
  const navigate = useNavigate();
  // useHardwareBackModal(open, () => onOpenChange(false));
  const [giftMsgOpen, setGiftMsgOpen] = useState(false);

  // Interlocked running totals — delegated to the Sovereign Checkout Runtime.
  // The UI captures intent; the Runtime computes truth (Constitution · Article 4).
  const { tipRailTotal, charityRailTotal } = computeCheckoutRails({
    effectiveGrand: o.effectiveGrand,
    tip: o.tip,
    charity: o.charity,
  });

  const blockedMessage = (() => {
    if (isLocked) return "السلة مقفلة بانتظار موافقات المشاركين";
    if (hasPricingErrors) return "يوجد منتجات تحتاج إلى استكمال بياناتها";
    if (o.logisticsBlocked)
      return o.logisticsQuote?.blockers[0]?.message ?? "لا يمكن إتمام الطلب — راجع تفاصيل التوصيل";
    if (o.giftMode && (!o.giftRecipientName.trim() || !o.giftRecipientPhone.trim() || !o.giftRecipientAddress.trim()))
      return "أكمل بيانات مستلم الهدية";
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

          {/* Gift Mode — Phase 12.8 */}
          <section
            className={`overflow-hidden rounded-2xl bg-card p-4 shadow-[0_4px_18px_-8px_rgba(0,0,0,0.1)] ring-1 transition ${
              o.giftMode ? "ring-rose-400/50" : "ring-border/30"
            }`}
          >
            <label className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-[12px] transition ${
                  o.giftMode ? "bg-gradient-to-br from-rose-500 to-rose-600 text-white" : "bg-foreground/5 text-foreground/70"
                }`}
              >
                <Gift className="h-5 w-5" strokeWidth={2.4} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-extrabold">إرسال كهدية 🎁</p>
                <p className="text-[10.5px] text-muted-foreground">
                  {o.giftMode
                    ? "لن نُرفق فاتورة السعر • الدفع الإلكتروني فقط"
                    : "إخفاء الفاتورة وفرض الدفع المسبق"}
                </p>
              </div>
              <Button
                type="button"
                role="switch"
                aria-checked={o.giftMode}
                onClick={() => o.setGiftMode(!o.giftMode)}
                className={`relative h-6 w-11 shrink-0 rounded-full transition ${
                  o.giftMode ? "bg-rose-500" : "bg-foreground/20"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
                    o.giftMode ? "right-0.5" : "right-[1.4rem]"
                  }`}
                />
              </Button>
            </label>

            <AnimatePresence>
              {o.giftMode && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="mt-3 space-y-2 overflow-hidden"
                >
                  <div className="space-y-2 rounded-xl bg-rose-500/5 p-3 ring-1 ring-rose-400/20">
                    <p className="text-[11px] font-extrabold text-rose-600">
                      بيانات المستلم 🎀
                    </p>
                    <Input
                      type="text"
                      value={o.giftRecipientName}
                      onChange={(e) => o.setGiftRecipientName(e.target.value)}
                      placeholder="اسم المستلم بالكامل"
                      maxLength={80}
                      className="w-full rounded-xl bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-rose-400/40"
                    />
                    <Input
                      type="tel"
                      inputMode="tel"
                      value={o.giftRecipientPhone}
                      onChange={(e) => o.setGiftRecipientPhone(e.target.value)}
                      placeholder="هاتف المستلم"
                      maxLength={20}
                      className="w-full rounded-xl bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-rose-400/40"
                    />
                    <textarea
                      value={o.giftRecipientAddress}
                      onChange={(e) => o.setGiftRecipientAddress(e.target.value)}
                      placeholder="عنوان تسليم الهدية بالتفصيل"
                      maxLength={300}
                      rows={2}
                      className="w-full rounded-xl bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-rose-400/40"
                    />
                  </div>
                  <Button
                    type="button"
                    onClick={() => setGiftMsgOpen((v) => !v)}
                    className="text-[11px] font-extrabold text-rose-600 underline-offset-2 hover:underline"
                  >
                    {giftMsgOpen ? "إخفاء رسالة الهدية" : "+ إضافة رسالة (اختياري)"}
                  </Button>
                  {giftMsgOpen && (
                    <textarea
                      value={o.giftMessage}
                      onChange={(e) => o.setGiftMessage(e.target.value)}
                      placeholder="اكتب رسالتك للمستلم…"
                      maxLength={160}
                      rows={2}
                      className="w-full rounded-xl bg-foreground/5 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-rose-400/40"
                    />
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </section>

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
              <Input
                value={o.promo}
                onChange={(e) => o.setPromo(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && o.applyPromo()}
                placeholder="كود الخصم (REEF10، WELCOME25)"
                className="flex-1 bg-transparent text-sm font-bold outline-none"
              />
              <Button
                onClick={o.applyPromo}
                className={`rounded-[10px] px-4 py-2 text-xs font-extrabold transition ${
                  o.appliedPromo ? "bg-primary text-primary-foreground" : "bg-foreground text-background"
                }`}
              >
                {o.appliedPromo ? <Check className="h-4 w-4" /> : "تطبيق"}
              </Button>
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

          {/* Smart Fakka — Team Bonus */}
          <SmartFakkaRail
            title="مكافأة فريق العمل"
            emoji="💚"
            runningTotal={tipRailTotal}
            value={o.tip}
            onChange={o.setTip}
            accent="primary"
          />

          {/* Smart Fakka — Charity (interlocked: starts after tip) */}
          <SmartFakkaRail
            title="صندوق الصدقات"
            emoji="🤲"
            runningTotal={charityRailTotal}
            value={o.charity}
            onChange={o.setCharity}
            causes={CHARITY_CAUSES}
            selectedCause={o.charityCauseId}
            onCauseChange={o.setCharityCauseId}
            accent="rose"
          />

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
                <Input
                  type="text"
                  value={o.guestName}
                  onChange={(e) => o.setGuestName(e.target.value)}
                  placeholder="الاسم بالكامل"
                  maxLength={80}
                  className="w-full rounded-xl bg-foreground/5 px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                />
                <Input
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

        {/* Sticky submit — 3/4 CTA + 1/4 Home shortcut (Phase 12.8) */}
        <div
          className="fixed inset-x-0 bottom-0 z-20 border-t border-border/40 bg-background/95 px-3 py-3 backdrop-blur"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 0.75rem)" }}
        >
          <div className="mx-auto flex w-full max-w-md flex-row-reverse items-stretch gap-2">
            <Button
              type="button"
              onClick={onSubmit}
              disabled={o.submitting || blockedMessage !== null}
              className="flex flex-1 items-center justify-between gap-3 rounded-2xl bg-primary px-4 py-3.5 font-extrabold text-primary-foreground shadow-[0_10px_30px_-10px_hsl(var(--primary)/0.55)] transition disabled:cursor-not-allowed disabled:bg-foreground/30 disabled:text-foreground/60"
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
                    ? blockedMessage.length > 38
                      ? `${blockedMessage.slice(0, 36)}…`
                      : blockedMessage
                    : o.submitting
                      ? "جاري تأمين طلبك..."
                      : "إتمام عبر واتساب"}
                </span>
              </span>
              <span className="rounded-[12px] bg-primary-foreground/15 px-3 py-1.5 text-sm font-extrabold tabular-nums">
                {toLatin(computeChargeableAmount(o.effectiveGrand))} ج
              </span>
            </Button>

            <Button
              type="button"
              aria-label="العودة للرئيسية"
              onClick={() => {
                onOpenChange(false);
                if (window.location.pathname === "/") {
                  window.scrollTo({ top: 0, behavior: "smooth" });
                } else {
                  navigate({ to: "/" });
                }
              }}
              className="flex w-16 shrink-0 flex-col items-center justify-center gap-0.5 rounded-2xl bg-card text-foreground ring-1 ring-border/50 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.25)] transition active:scale-95"
            >
              <Home className="h-5 w-5" strokeWidth={2.4} />
              <span className="text-[9.5px] font-extrabold leading-none">الرئيسية</span>
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
