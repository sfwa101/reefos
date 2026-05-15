import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { CalendarDays, Home, Lock, ShoppingBag, Sparkles, Zap } from "lucide-react";
import { CommerceGateway } from "@/core/commerce";
import BackHeader from "@/components/BackHeader";
import CartUpgradeBanner from "@/core/runtime-ui/blocks/commerce/cart-upgrade-banner";
import { toLatin } from "@/lib/format";
import { useCartOrchestrator } from "@/apps/reef-al-madina/features/cart/hooks/useCartOrchestrator";
import { useSharedCart } from "@/core/orders/runtime/SharedCartRuntime";
import { CartCrossSellRail } from "@/apps/reef-al-madina/features/cart/components/CartCrossSellRail";
import { CartAddressSelector } from "@/apps/reef-al-madina/features/cart/components/CartAddressSelector";
import { CartSummary } from "@/apps/reef-al-madina/features/cart/components/CartSummary";
import { VendorGroupCard } from "@/apps/reef-al-madina/features/cart/components/VendorGroupCard";
import { SharedCartManager } from "@/apps/reef-al-madina/features/cart/components/SharedCartManager";
import { WhatsAppFallbackDialog } from "@/apps/reef-al-madina/features/cart/components/WhatsAppFallbackDialog";
import { CartPricingErrorsBanner } from "@/apps/reef-al-madina/features/cart/components/CartPricingErrorsBanner";
import { CartLogisticsBanners } from "@/apps/reef-al-madina/features/cart/components/CartLogisticsBanners";
import { CheckoutSheet } from "@/apps/reef-al-madina/features/cart/components/CheckoutSheet";
import { PremiumProgressBar } from "@/apps/reef-al-madina/features/cart/components/PremiumProgressBar";
import { CartIncentiveProgress } from "@/apps/reef-al-madina/features/cart/components/CartIncentiveProgress";
import { CartLoyaltyBar } from "@/apps/reef-al-madina/features/cart/components/CartLoyaltyBar";
import { RechargeDialog } from "@/apps/reef-al-madina/features/cart/components/RechargeDialog";
import { HakimPredictiveBasket } from "@/apps/reef-al-madina/features/cart/components/HakimPredictiveBasket";
import type { SharedCartSplitType } from "@/apps/reef-al-madina/features/cart/hooks/useSharedCartSync";

const Cart = () => {
  const { sharedCartId } = useSharedCart();
  const o = useCartOrchestrator({ sharedCartId });
  const hasPricingErrors = o.hasPricingErrors;
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const navigate = useNavigate();

  const updateSplit = (
    participantId: string,
    splitType: SharedCartSplitType,
    splitValue: number,
  ) => CommerceGateway.updateSharedCartParticipantSplit(participantId, splitType, splitValue);

  const isLocked = o.isSharedMode && o.sharedCart?.status === "pending_approvals";
  const paymentsHalted = !o.paymentsEnabled;
  const checkoutDisabled = o.logisticsBlocked || hasPricingErrors || isLocked || paymentsHalted;

  if (o.lines.length === 0) {
    return (
      <div className="px-4">
        <BackHeader title="سلتي" subtitle="جاهز للطلب" />
        <HakimPredictiveBasket className="mt-4" />
        <div className="mt-8 flex flex-col items-center gap-4 text-center">
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
    <div className="space-y-4 pb-28">
      <BackHeader title="سلتي" subtitle={`${toLatin(o.count)} منتج`} />

      {/* Premium Progress Bar — Phase 12.8 */}
      <PremiumProgressBar progress={o.progress} />

      {/* Incentives ladder + loyalty (Phase 12.10 — re-injected) */}
      <CartIncentiveProgress subtotal={o.subtotal} />
      <CartLoyaltyBar />

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

      {/* Sticky CTA — 3/4 checkout + 1/4 home shortcut (Phase 12.8) */}
      <motion.div
        initial={{ y: 80 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", damping: 24, stiffness: 240 }}
        className="fixed inset-x-0 bottom-0 z-40 px-3 pb-3 pt-2"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 0.75rem)" }}
      >
        <div className="mx-auto flex w-full max-w-md flex-row-reverse items-stretch gap-2">
          {/* Primary CTA — flex-1 (≈3/4) */}
          <button
            type="button"
            onClick={() => setCheckoutOpen(true)}
            disabled={checkoutDisabled}
            className="flex flex-1 items-center justify-between gap-3 rounded-[18px] bg-gradient-to-r from-primary via-[hsl(var(--primary)/0.9)] to-primary px-4 py-3.5 font-extrabold text-primary-foreground shadow-[0_10px_30px_-10px_hsl(var(--primary)/0.55)] transition disabled:cursor-not-allowed disabled:from-foreground/20 disabled:via-foreground/20 disabled:to-foreground/20 disabled:text-foreground/60"
          >
            <span className="flex items-center gap-2 text-sm">
              {checkoutDisabled && <Lock className="h-4 w-4" />}
              {paymentsHalted
                ? "نظام الدفع متوقف مؤقتاً للتحديث"
                : isLocked
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

          {/* Home shortcut — shrink-0 w-16 (≈1/4) */}
          <button
            type="button"
            aria-label="العودة للرئيسية"
            onClick={() => navigate({ to: "/" })}
            className="flex w-16 shrink-0 flex-col items-center justify-center gap-0.5 rounded-[18px] bg-card text-foreground ring-1 ring-border/50 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.25)] transition active:scale-95"
          >
            <Home className="h-5 w-5" strokeWidth={2.4} />
            <span className="text-[9.5px] font-extrabold leading-none">الرئيسية</span>
          </button>
        </div>
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
