import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";

import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { useLocation } from "@/context/LocationContext";
import { supabase } from "@/integrations/supabase/client";
import { fmtMoney } from "@/lib/format";
import { fireConfetti } from "@/lib/confetti";
import {
  WA_NUMBER,
  type Addr,
} from "../types/cart.types";
import { type OpenResult } from "@/lib/whatsapp";
import type { WaFallbackPayload } from "../components/WhatsAppFallbackDialog";
import {
  useCartValidation,
  safeUuidOrNull,
  validateGuestFields,
  validateMinOrder,
} from "./useCartValidation";
import { placeOrderAtomic, allocateOrderInventory } from "./useCartCheckoutRpc";
import { buildWhatsAppMessage, buildOrderNotes, dispatchWhatsApp } from "./useCartWhatsApp";
import { useSharedCartAdapter } from "./useSharedCartAdapter";
import { useCartCalculations } from "./useCartCalculations";
import { useCartVendorGrouping } from "./useCartVendorGrouping";
import { useSystemSetting } from "@/hooks/useSystemSettings";
import { useCartCheckoutRules } from "@/context/CartContext";
import { isPerishable } from "@/lib/products";
import { computeLogisticsQuote } from "@/core/logistics/quote";
import { useDefaultDeliveryMethod } from "@/features/logistics/hooks/useDefaultDeliveryMethod";
import { legacyZoneToLogisticsZone } from "@/features/logistics/adapters/legacyZoneToLogisticsZone";
import { PAYMENT_METHODS, findPaymentMethod } from "../data/paymentMethods";

/** @deprecated Re-exported only for backward compatibility. Import PAYMENT_METHODS instead. */
export const paymentOptions = PAYMENT_METHODS;

/**
 * Single source of truth for the Cart UI: state, derived totals, fulfillment
 * segmentation, multi-vendor grouping, cross-sell, and the WhatsApp checkout
 * pipeline. This hook is now a thin Facade that composes:
 *   - useSharedCartAdapter  → shared/local cart unification
 *   - useCartCalculations   → totals, sweets, wallet split, progress
 *   - useCartVendorGrouping → vendor segmentation + cross-sell
 *   - useCartValidation     → promo + min-order
 *   - useCartCheckoutRpc / useCartWhatsApp → checkout side-effects
 */
export const useCartOrchestrator = (opts?: { sharedCartId?: string | null }) => {
  const sharedCartId = opts?.sharedCartId ?? null;

  const cart = useSharedCartAdapter(sharedCartId);
  const { lines, count, total, setQty, remove, add, clear, updateMeta, isSharedMode, shared } = cart;

  const { user } = useAuth();
  const navigate = useNavigate();
  const { zone, setFromAddress } = useLocation();

  // Dynamic kill-switch: when disabled, checkout completes in-app and skips WhatsApp dispatch.
  const { value: enableWaCheckout } = useSystemSetting<boolean>("enable_whatsapp_checkout", true);

  const { promo, setPromo, appliedPromo, applyPromo, minOrderTotal } =
    useCartValidation(total);

  const [tip, setTip] = useState(0);
  const [addresses, setAddresses] = useState<Addr[]>([]);
  const [addrId, setAddrId] = useState<string>("");
  const [guestNotes, setGuestNotes] = useState("");
  const [payment, setPayment] = useState<string>("wallet");
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const [waFallback, setWaFallback] = useState<WaFallbackPayload | null>(null);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [trustLimit, setTrustLimit] = useState<number>(0);
  const [showRecharge, setShowRecharge] = useState(false);
  const [secondaryPayment, setSecondaryPayment] = useState<string>("cash");
  const [saveChange, setSaveChange] = useState<boolean>(true);
  const [donateChange, setDonateChange] = useState<boolean>(false);
  const [customerName, setCustomerName] = useState<string>("");
  const [guestName, setGuestName] = useState<string>("");
  const [guestPhone, setGuestPhone] = useState<string>("");
  const [guestAddress, setGuestAddress] = useState<string>("");
  // Phase 12.8 — Gift mode + Smart Fakka (charity)
  const [giftMode, setGiftMode] = useState<boolean>(false);
  const [giftMessage, setGiftMessage] = useState<string>("");
  const [giftRecipientName, setGiftRecipientName] = useState<string>("");
  const [giftRecipientPhone, setGiftRecipientPhone] = useState<string>("");
  const [giftRecipientAddress, setGiftRecipientAddress] = useState<string>("");
  const [charity, setCharity] = useState<number>(0);
  const [charityCauseId, setCharityCauseId] = useState<string>("food");

  useEffect(() => {
    if (!user) {
      setAddresses([]);
      setAddrId("");
      setWalletBalance(0);
      return;
    }
    (async () => {
      const [
        { data: addrData },
        { data: balData },
        { data: profileData },
        { data: trustData },
      ] = await Promise.all([
        supabase
          .from("addresses")
          .select("id,label,city,district,street,building,is_default")
          .eq("user_id", user.id)
          .order("is_default", { ascending: false }),
        supabase.from("wallet_balances").select("balance").eq("user_id", user.id).maybeSingle(),
        supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
        supabase.rpc("user_trust_limit", { _user_id: user.id }),
      ]);
      const list = (addrData as Addr[]) ?? [];
      setAddresses(list);
      const def = list.find((a) => a.is_default) ?? list[0];
      if (def) setAddrId(def.id);
      setWalletBalance(Number(balData?.balance ?? 0));
      setTrustLimit(Number(trustData ?? 0));
      setCustomerName(((profileData as { full_name?: string } | null)?.full_name ?? "").trim());
    })();
  }, [user]);

  useEffect(() => {
    const a = addresses.find((x) => x.id === addrId);
    if (a) setFromAddress(a.city, a.district);
  }, [addrId, addresses, setFromAddress]);

  useEffect(() => {
    if (!zone.codAllowed) {
      if (payment === "cash") setPayment("wallet");
      if (secondaryPayment === "cash") setSecondaryPayment("instapay");
    }
  }, [zone.codAllowed, payment, secondaryPayment]);

  // Defer heavy derivations (totals, sweets buckets, vendor grouping) so the
  // qty +/- UI stays at 60fps even under rapid input.
  const deferredLines = useDeferredValue(lines);
  const deferredTotal = useDeferredValue(total);

  const calc = useCartCalculations({
    lines: deferredLines,
    total: deferredTotal,
    zone,
    appliedPromo,
    tip,
    payment,
    walletBalance,
    trustLimit,
    secondaryPayment,
  });
  const {
    subtotal,
    discount,
    delivery,
    grand,
    sweetsBuckets,
    sweetsRules,
    aggregateDeposit,
    anyWaitForAll,
    hasInstantSweets,
    hasFreshSweets,
    hasBooking,
    hasNonBookingItems,
    payDeposit,
    payOnDelivery,
    billSavings,
    isWalletPay,
    walletShortfall,
    walletApplied,
    trustUsed,
    isSplit,
    roundedCash,
    changeRemainder,
    showChangeJar,
    progress,
    FREE_DELIVERY_THRESHOLD,
  } = calc;

  // Phase 6 — engine-driven checkout guardrails (deposit / COD block).
  const engineRules = useCartCheckoutRules();

  useEffect(() => {
    if (sweetsRules.blockCOD && payment === "cash") {
      setPayment("wallet");
      toast.message("الدفع عند الاستلام غير متاح للحجوزات المسبقة 🍰", {
        description: "تم التحويل إلى المحفظة الذكية",
      });
    }
    if (sweetsRules.blockCOD && secondaryPayment === "cash") {
      setSecondaryPayment("instapay");
    }
  }, [sweetsRules.blockCOD, payment, secondaryPayment]);

  // Engine-driven block (Phase 6) — required deposit ⇒ upfront payment only.
  useEffect(() => {
    if (engineRules.blocksCOD && payment === "cash") {
      setPayment("wallet");
      toast.message("الدفع عند الاستلام غير متاح", {
        description: `العربون المطلوب ${fmtMoney(engineRules.totalDepositAmount)} يُدفع مسبقاً`,
      });
    }
    if (engineRules.blocksCOD && secondaryPayment === "cash") {
      setSecondaryPayment("instapay");
    }
  }, [engineRules.blocksCOD, engineRules.totalDepositAmount, payment, secondaryPayment]);

  const grouping = useCartVendorGrouping(deferredLines, payment);
  const {
    crossSell,
    vendorGroups,
    instantGroups,
    scheduledGroups,
    showFulfillmentSections,
    isMultiVendor,
    totalCashback,
    groupIsMixedScheduled,
  } = grouping;

  const paymentLabel = findPaymentMethod(payment)?.label ?? "";
  const secondaryLabel = findPaymentMethod(secondaryPayment)?.label ?? "";
  const selectedAddr = addresses.find((a) => a.id === addrId);

  // Logistics Engine quote — single source of truth for delivery fee, ETA,
  // blockers (min-order) and warnings (perishables / surge).
  const { data: deliveryMethod } = useDefaultDeliveryMethod();
  const logisticsQuote = useMemo(() => {
    if (!deliveryMethod) return null;
    const hasPerishables = lines.some((l) => isPerishable(l.product));
    return computeLogisticsQuote({
      zone: legacyZoneToLogisticsZone(zone),
      method: deliveryMethod,
      subtotal,
      hasPerishables,
    });
  }, [deliveryMethod, zone, subtotal, lines]);

  const logisticsBlocked = (logisticsQuote?.blockers.length ?? 0) > 0;
  const effectiveDelivery = logisticsQuote?.deliveryFee ?? delivery;
  const effectiveGrand =
    logisticsQuote != null
      ? Math.max(0, subtotal - discount + effectiveDelivery + tip + charity)
      : Math.max(0, grand + charity);
  /** Engine-driven COD permission. Falls back to legacy zone flag while quote loads.
   *  Gift mode forces electronic payment (no COD) so the recipient is not asked to pay. */
  const codAllowed = giftMode
    ? false
    : logisticsQuote
      ? logisticsQuote.zone.codAllowed
      : zone.codAllowed;

  // Auto-switch off cash whenever gift mode flips on
  useEffect(() => {
    if (giftMode && payment === "cash") setPayment("wallet");
    if (giftMode && secondaryPayment === "cash") setSecondaryPayment("instapay");
  }, [giftMode, payment, secondaryPayment]);



  const checkoutWA = async () => {
    if (submittingRef.current) {
      console.warn("[checkout] duplicate submit blocked");
      return;
    }

    const source = "CartCheckoutActions:onCheckout→useCartOrchestrator.checkoutWA";
    console.info("[checkout] WhatsApp checkout invoked", {
      source,
      cartLines: lines.length,
    });
    submittingRef.current = true;
    setSubmitting(true);
    const minLoading = new Promise<void>((r) => setTimeout(r, 1000));
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const currentUser = (user ?? session?.user) || null;
      const isGuest = !currentUser;

      if (isGuest) {
        if (!validateGuestFields(guestName, guestPhone, guestAddress)) {
          setSubmitting(false);
          submittingRef.current = false;
          return;
        }
      }

      if (!validateMinOrder(grand, minOrderTotal)) {
        setSubmitting(false);
        submittingRef.current = false;
        return;
      }

      const noteParts = buildOrderNotes([
        appliedPromo ? `كود: ${appliedPromo.code}` : null,
        tip > 0 ? `إكرامية: ${tip}` : null,
        !selectedAddr && guestNotes ? `العنوان: ${guestNotes}` : null,
        isSplit
          ? `دفع مُجزّأ: محفظة ${Math.round(walletApplied)} + ${secondaryLabel} ${Math.round(walletShortfall)}`
          : null,
        showChangeJar && saveChange && !donateChange
          ? `ادخار الفكة: ${changeRemainder} ج.م للحصّالة`
          : null,
        showChangeJar && donateChange
          ? `تبرع بالفكة: ${changeRemainder} ج.م للصندوق العام`
          : null,
        sweetsRules.hasBooking ? `حجوزات: ${fmtMoney(sweetsRules.bookingSubtotal)}` : null,
        sweetsRules.hasBooking
          ? `يُدفع الآن من الحجوزات: ${fmtMoney(aggregateDeposit)}`
          : null,
        giftMode && giftRecipientName ? `🎁 مستلم الهدية: ${giftRecipientName}` : null,
        giftMode && giftRecipientPhone ? `هاتف المستلم: ${giftRecipientPhone}` : null,
        giftMode && giftRecipientAddress ? `عنوان التسليم: ${giftRecipientAddress}` : null,
        giftMode && giftMessage ? `رسالة الهدية: ${giftMessage}` : null,
      ]);

      const orderNum = `ORD-${Math.floor(10000 + Math.random() * 90000)}`;
      let savedOrderId: string | null = null;

      if (!isGuest && currentUser) {
        // Phase 13.2 — Build a single fulfillment wave with ALL items.
        // Smart splitting (instant vs preorder) will be wired in a later UI phase.
        const orderItems = lines.map((l) => ({
          product_id: l.product.id,
          product_name: l.product.name,
          product_image: l.product.image ?? null,
          price: l.meta?.unitPrice ?? l.product.price,
          quantity: l.qty,
        }));

        const result = await placeOrderAtomic({
          user_id: currentUser.id,
          total: effectiveGrand,
          payment_method: payment,
          address_id: safeUuidOrNull(selectedAddr?.id),
          notes: noteParts,
          service_type: "delivery",
          delivery_zone: zone.id ?? null,
          wallet_applied: walletApplied,
          wallet_shortfall: walletShortfall,
          secondary_payment: isSplit ? secondaryPayment : null,
          total_cashback: payment === "wallet" ? totalCashback : 0,
          change_remainder: showChangeJar ? changeRemainder : 0,
          save_change: showChangeJar && saveChange && !donateChange,
          donate_change: showChangeJar && donateChange,
          tip,
          promo_code: appliedPromo?.code ?? null,
          discount,
          // Phase 13.1 financial fields
          tip_amount: tip,
          charity_amount: charity,
          charity_cause_id: charity > 0 ? charityCauseId : null,
          is_gift: giftMode,
          gift_message: giftMode ? (giftMessage || null) : null,
          upfront_payment_required: 0,
          upfront_payment_collected: 0,
          // Single-wave fulfillment (smart split is a later UI phase)
          fulfillments: [
            {
              sequence: 1,
              status: "pending",
              delivery_method_id: deliveryMethod?.id ?? null,
              scheduled_for: null,
              eta_minutes: logisticsQuote?.etaMinutes ?? null,
              delivery_fee: effectiveDelivery,
              notes: null,
              items: orderItems,
            },
          ],
        });

        if (!result.ok || !result.orderId) {
          console.error("[checkout] place_order_atomic failed — aborting", result);
          toast.error((!result.ok && result.error) || "حدث خطأ أثناء تسجيل الطلب");
          setSubmitting(false);
          submittingRef.current = false;
          return;
        }
        savedOrderId = result.orderId;

        await allocateOrderInventory(savedOrderId, zone.id);
      }

      const mainMessage = buildWhatsAppMessage({
        isGuest,
        guestName,
        guestPhone,
        guestAddress,
        guestNotes,
        customerName,
        currentUserEmail: currentUser?.email ?? null,
        selectedAddr: selectedAddr ?? null,
        orderNum,
        zoneEtaLabel: zone.etaLabel,
        lines,
        payment,
        paymentLabel,
        isSplit,
        walletApplied,
        walletShortfall,
        secondaryLabel,
        subtotal,
        delivery,
        billSavings,
        tip,
        sweetsRules,
        aggregateDeposit,
        payOnDelivery,
        grand,
        totalCashback,
      });

      await minLoading;

      const mainPhone = WA_NUMBER;
      const orderId = savedOrderId ?? orderNum;
      const orderTotal = grand;

      // CRITICAL: clear cart immediately after server confirms, BEFORE any navigation.
      clear();
      fireConfetti();

      // Kill-switch: in-app completion only.
      if (!enableWaCheckout) {
        try { sessionStorage.removeItem("reef:checkout:wa-fallback"); } catch { /* noop */ }
        console.info("[checkout] WhatsApp disabled by admin → in-app completion", { source });
        toast.success("تم استلام طلبك بنجاح 🎉");
        navigate({ to: "/order-success", search: { id: orderId, total: orderTotal } });
        setSubmitting(false);
        submittingRef.current = false;
        return;
      }

      const openResult: OpenResult = dispatchWhatsApp({
        phone: mainPhone,
        text: mainMessage,
        source,
      });

      if (!openResult.ok) {
        console.warn("[checkout] WhatsApp open blocked, success fallback armed", {
          source,
          reason: openResult.reason,
        });
        try {
          sessionStorage.setItem(
            "reef:checkout:wa-fallback",
            JSON.stringify({ phone: mainPhone, text: mainMessage, orderId, total: orderTotal }),
          );
        } catch (e) {
          console.warn("[checkout] failed to persist WhatsApp fallback", e);
        }
        setWaFallback({ phone: mainPhone, text: mainMessage, orderId, total: orderTotal });
        toast.message("اضغط على فتح واتساب لإكمال الطلب", {
          description: "منع المتصفح الفتح التلقائي",
        });
      } else {
        console.info("[checkout] WhatsApp opened", { source, method: openResult.method });
        try {
          sessionStorage.removeItem("reef:checkout:wa-fallback");
        } catch {
          /* noop */
        }
      }

      const restaurantGroups = vendorGroups.filter((g) => g.vendor.kind === "restaurant");
      if (restaurantGroups.length > 0) {
        console.info(
          "[checkout] vendor messages prepared (delivered via DB notifications):",
          restaurantGroups.map((g) =>
            g.vendor.kind === "restaurant" ? g.vendor.restaurant.name : "?",
          ),
        );
      }
      if (sweetsBuckets.C.lines.length > 0) {
        console.info("[checkout] producer booking present (DB-routed)");
      }

      toast.success("تم إرسال طلبك إلى واتساب 🎉");
      navigate({ to: "/order-success", search: { id: orderId, total: orderTotal } });
      setSubmitting(false);
      submittingRef.current = false;
    } catch (err) {
      console.error("[checkout] unexpected error:", err);
      toast.error("حدث خطأ غير متوقّع");
      setSubmitting(false);
      submittingRef.current = false;
    }
  };

  const dismissWaFallback = () => {
    setWaFallback(null);
  };

  return {
    // cart context passthrough
    lines,
    count,
    setQty,
    remove,
    add,
    clear,
    updateMeta,
    user,
    zone,
    // address state
    addresses,
    addrId,
    setAddrId,
    selectedAddr,
    guestNotes,
    setGuestNotes,
    // guest fields
    guestName,
    setGuestName,
    guestPhone,
    setGuestPhone,
    guestAddress,
    setGuestAddress,
    customerName,
    // promo / tip
    promo,
    setPromo,
    appliedPromo,
    applyPromo,
    tip,
    setTip,
    // payments
    payment,
    setPayment,
    secondaryPayment,
    setSecondaryPayment,
    paymentLabel,
    secondaryLabel,
    walletBalance,
    trustLimit,
    walletApplied,
    walletShortfall,
    trustUsed,
    isWalletPay,
    isSplit,
    showRecharge,
    setShowRecharge,
    saveChange,
    setSaveChange,
    donateChange,
    setDonateChange,
    showChangeJar,
    roundedCash,
    changeRemainder,
    // totals
    subtotal,
    discount,
    delivery,
    grand,
    tipAmount: tip,
    billSavings,
    minOrderTotal,
    progress,
    FREE_DELIVERY_THRESHOLD,
    // sweets / fulfillment
    sweetsBuckets,
    sweetsRules,
    // engine-driven checkout guardrails (Phase 6)
    engineRules,
    aggregateDeposit,
    payOnDelivery,
    payDeposit,
    anyWaitForAll,
    hasBooking,
    hasNonBookingItems,
    hasInstantSweets,
    hasFreshSweets,
    // vendor segmentation
    vendorGroups,
    instantGroups,
    scheduledGroups,
    showFulfillmentSections,
    isMultiVendor,
    totalCashback,
    groupIsMixedScheduled,
    // cross-sell
    crossSell,
    // checkout
    submitting,
    checkoutWA,
    // WhatsApp fallback dialog
    waFallback,
    dismissWaFallback,
    // shared cart (Phase 6)
    isSharedMode,
    sharedCartId,
    sharedCart: shared.cart,
    sharedParticipants: shared.participants,
    sharedItems: shared.items,
    sharedIsOwner: shared.isOwner,
    sharedMyParticipant: shared.myParticipant,
    sharedRequestApprovals: shared.requestApprovals,
    sharedReopenForEdits: shared.reopenForEdits,
    sharedApprove: shared.approve,
    sharedReject: shared.reject,
    sharedCancel: shared.cancelCart,
    sharedMarkCompleted: shared.markCompleted,
    // Logistics engine surface (Phase 12.7)
    logisticsQuote,
    logisticsBlocked,
    effectiveDelivery,
    effectiveGrand,
    codAllowed,
    // Phase 12.8 — Gift mode + Smart Fakka (charity)
    giftMode,
    setGiftMode,
    giftMessage,
    setGiftMessage,
    charity,
    setCharity,
    charityCauseId,
    setCharityCauseId,
  };
};

export type CartOrchestrator = ReturnType<typeof useCartOrchestrator>;
