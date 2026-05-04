import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { CalendarDays, Gift, Lock, ShoppingBag, Sparkles, Truck, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import BackHeader from "@/components/BackHeader";
import CartUpgradeBanner from "@/components/baskets/CartUpgradeBanner";
import { toLatin } from "@/lib/format";
import { useCartOrchestrator } from "@/features/cart/hooks/useCartOrchestrator";
import { useSharedCartContext } from "@/context/SharedCartContext";
import { CartCrossSellRail } from "@/features/cart/components/CartCrossSellRail";
import { CartAddressSelector } from "@/features/cart/components/CartAddressSelector";
import { CartSummary } from "@/features/cart/components/CartSummary";
import { VendorGroupCard } from "@/features/cart/components/VendorGroupCard";
import { SharedCartManager } from "@/features/cart/components/SharedCartManager";
import { WhatsAppFallbackDialog } from "@/features/cart/components/WhatsAppFallbackDialog";
import { CartPricingErrorsBanner } from "@/features/cart/components/CartPricingErrorsBanner";
import { CartLogisticsBanners } from "@/features/cart/components/CartLogisticsBanners";
import { CheckoutSheet } from "@/features/cart/components/CheckoutSheet";
import { RechargeDialog } from "@/features/cart/components/RechargeDialog";
import { useCartHasErrors } from "@/context/CartContext";
import type { SharedCartSplitType } from "@/features/cart/hooks/useSharedCartSync";

const Cart = () => {
  const { sharedCartId } = useSharedCartContext();
  const o = useCartOrchestrator({ sharedCartId });
  const hasPricingErrors = useCartHasErrors();
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const updateSplit = async (
    participantId: string,
    splitType: SharedCartSplitType,
    splitValue: number,
  ) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("shared_cart_participants")
      .update({ split_type: splitType, split_value: splitValue })
      .eq("id", participantId);
    if (error) throw error;
  };

  const isLocked = o.isSharedMode && o.sharedCart?.status === "pending_approvals";
  const checkoutDisabled = o.logisticsBlocked || hasPricingErrors || isLocked;

  if (o.lines.length === 0) {
    return (
      <div className="px-4">
        <BackHeader title="سلتي" subtitle="جاهز للطلب" />
        <div className="mt-12 flex flex-col items-center gap-4 text-center">
          <div className="flex h-24 w-24 items-center justify-center rounded-[28px] bg-primary-soft">
            <ShoppingBag className="h-10 w-10 text-primary" strokeWidth={2} />
          </div>
          <h2 className="font-display text-2xl font-extrabold">السلة فارغة</h2>
          <p className="text-sm text-muted-foreground">ابدأ التسوق من أقسامنا المختلفة</p>
          <Link to="/sections" className="rounded-2xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-pill">
            تصفّح الأقسام
          </Link>
        </div>
        <WhatsAppFallbackDialog open={!!o.waFallback} payload={o.waFallback} onClose={o.dismissWaFallback} />
      </div>
    );
  }

  return (
    <div className="space-y-4 px-4 pb-28">
      <BackHeader title="سلتي" subtitle={`${toLatin(o.count)} منتج`} />

      {/* Smart Progress Bar */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-2xl bg-gradient-to-l from-primary/10 via-accent/10 to-primary/5 p-3 ring-1 ring-primary/15">
        <div className="mb-2 flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-[10px] bg-primary text-primary-foreground">
            {o.progress.done ? <Gift className="h-3.5 w-3.5" /> : <Truck className="h-3.5 w-3.5" />}
          </div>
          <p className="flex-1 text-[11px] font-extrabold text-foreground">{o.progress.label}</p>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-foreground/10">
          <motion.div initial={{ width: 0 }} animate={{ width: `${o.progress.pct}%` }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }} className="h-full rounded-full bg-gradient-to-r from-primary to-accent" />
        </div>
      </motion.div>

      <CartUpgradeBanner />
      <CartPricingErrorsBanner />

      {/* Lines */}
      <div className="space-y-4">
        {o.isMultiVendor && (
          <div className="flex items-start gap-2 rounded-2xl bg-accent/10 p-2.5 ring-1 ring-accent/20">
            <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-foreground" />
            <p className="text-[11px] font-bold text-foreground">
              طلبك يحتوي على <span className="text-accent-foreground">{toLatin(o.vendorGroups.length)} موردين</span> — كل قسم سيصل من مصدره الخاص.
            </p>
          </div>
        )}

        {o.showFulfillmentSections && (
          <div className="flex items-center gap-2 px-1">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
              <Zap className="h-3 w-3" strokeWidth={2.6} />
            </div>
            <h3 className="font-display text-[13px] font-extrabold text-foreground">
              يصلك فوراً
              <span className="ms-1.5 text-[10px] font-bold text-muted-foreground">خلال {o.zone.etaLabel}</span>
            </h3>
          </div>
        )}

        {(o.showFulfillmentSections ? o.instantGroups : o.vendorGroups).map((g) => (
          <VendorGroupCard key={g.key} g={g} payment={o.payment} setQty={o.setQty} remove={o.remove} updateMeta={o.updateMeta} showScheduledHint={!o.showFulfillmentSections && o.groupIsMixedScheduled(g)} />
        ))}

        {o.showFulfillmentSections && (
          <>
            <div className="mt-2 flex items-center gap-2 px-1">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-500/15 text-violet-700 dark:text-violet-300">
                <CalendarDays className="h-3 w-3" strokeWidth={2.6} />
              </div>
              <h3 className="font-display text-[13px] font-extrabold text-foreground">
                حجوزات مجدولة
                <span className="ms-1.5 text-[10px] font-bold text-muted-foreground">حسب الموعد</span>
              </h3>
            </div>
            {o.scheduledGroups.map((g) => (
              <VendorGroupCard key={g.key} g={g} payment={o.payment} setQty={o.setQty} remove={o.remove} updateMeta={o.updateMeta} />
            ))}
          </>
        )}
        <p className="px-1 text-center text-[10px] text-muted-foreground">💡 اسحب المنتج لليسار للحذف السريع</p>
      </div>

      <CartCrossSellRail items={o.crossSell} add={o.add} />

      <CartAddressSelector
        user={o.user}
        addresses={o.addresses}
        addrId={o.addrId}
        setAddrId={o.setAddrId}
        guestNotes={o.guestNotes}
        setGuestNotes={o.setGuestNotes}
      />

      <CartLogisticsBanners quote={o.logisticsQuote} />

      {o.isSharedMode && o.sharedCart && (
        <SharedCartManager
          cart={o.sharedCart}
          participants={o.sharedParticipants}
          isOwner={o.sharedIsOwner}
          subtotal={o.subtotal}
          onRequestApprovals={o.sharedRequestApprovals}
          onReopenForEdits={o.sharedReopenForEdits}
          onCancel={o.sharedCancel}
          onUpdateSplit={updateSplit}
        />
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

      <button onClick={() => o.clear()} className="w-full rounded-2xl bg-foreground/5 py-3 text-xs font-bold text-muted-foreground">
        تفريغ السلة
      </button>

      {/* Single sticky CTA — opens the Zen Checkout Sheet */}
      <motion.div
        initial={{ y: 80 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", damping: 24, stiffness: 240 }}
        className="fixed inset-x-0 bottom-0 z-40 px-3 pb-3 pt-2"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 0.75rem)" }}
      >
        <button
          type="button"
          onClick={() => setCheckoutOpen(true)}
          disabled={checkoutDisabled}
          className="mx-auto flex w-full max-w-md items-center justify-between gap-3 rounded-[18px] bg-gradient-to-r from-primary via-[hsl(var(--primary)/0.9)] to-primary px-4 py-3.5 font-extrabold text-primary-foreground shadow-[0_10px_30px_-10px_hsl(var(--primary)/0.55)] transition disabled:cursor-not-allowed disabled:from-foreground/20 disabled:via-foreground/20 disabled:to-foreground/20 disabled:text-foreground/60"
        >
          <span className="flex items-center gap-2 text-sm">
            {checkoutDisabled && <Lock className="h-4 w-4" />}
            {isLocked
              ? "مقفلة — بانتظار الموافقات"
              : hasPricingErrors
                ? "أكمل بيانات المنتجات أولاً"
                : o.logisticsBlocked
                  ? o.logisticsQuote?.blockers[0]?.code === "below_min_order"
                    ? "الحد الأدنى للمنطقة غير مكتمل"
                    : "غير متاح في منطقتك حالياً"
                  : "متابعة الدفع"}
          </span>
          <span className="rounded-[12px] bg-primary-foreground/15 px-3 py-1.5 text-sm font-extrabold tabular-nums">
            {toLatin(Math.round(o.effectiveGrand))} ج
          </span>
        </button>
      </motion.div>

      <CheckoutSheet
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        o={o}
        hasPricingErrors={hasPricingErrors}
        isLocked={isLocked}
      />

      <AnimatePresence>
        {o.showRecharge && o.user && (
          <RechargeDialog
            onClose={() => o.setShowRecharge(false)}
            userId={o.user.id}
            currentBalance={o.walletBalance}
            shortfall={Math.max(0, o.grand - o.walletBalance)}
          />
        )}
      </AnimatePresence>

      <WhatsAppFallbackDialog open={!!o.waFallback} payload={o.waFallback} onClose={o.dismissWaFallback} />
    </div>
  );
};

export default Cart;
