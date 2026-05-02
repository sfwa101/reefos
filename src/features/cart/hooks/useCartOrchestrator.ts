import { useDeferredValue, useEffect, useRef, useState } from "react";

import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { useLocation } from "@/context/LocationContext";
import { supabase } from "@/integrations/supabase/client";
import { fmtMoney } from "@/lib/format";
import { fireConfetti } from "@/lib/confetti";
import {
  Banknote,
  CreditCard,
  Smartphone,
  Wallet as WalletIcon,
} from "lucide-react";
import {
  WA_NUMBER,
  type Addr,
} from "../types/cart.types";
import { preOpenWindow, isMobileWaContext, type OpenResult } from "@/lib/whatsapp";
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

export const paymentOptions = [
  { id: "wallet", label: "المحفظة الذكية", icon: WalletIcon, sub: "خصم فوري من رصيدك" },
  { id: "cash", label: "كاش عند الاستلام", icon: Banknote, sub: "ادفع للمندوب" },
  { id: "vodafone-cash", label: "فودافون كاش", icon: Smartphone, sub: "تحويل فوري" },
  { id: "instapay", label: "إنستا باي", icon: CreditCard, sub: "تحويل بنكي" },
];

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

  const calc = useCartCalculations({
    lines,
    total,
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

  const grouping = useCartVendorGrouping(lines, payment);
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

  const paymentLabel = paymentOptions.find((p) => p.id === payment)?.label ?? "";
  const secondaryLabel = paymentOptions.find((p) => p.id === secondaryPayment)?.label ?? "";
  const selectedAddr = addresses.find((a) => a.id === addrId);

  const checkoutWA = async () => {
    if (submittingRef.current) {
      console.warn("[checkout] duplicate submit blocked");
      return;
    }

    const source = "CartCheckoutActions:onCheckout→useCartOrchestrator.checkoutWA";
    const onMobile = isMobileWaContext();
    const preOpened: Window | null = onMobile ? null : preOpenWindow(source);
    console.info("[checkout] WhatsApp checkout invoked", {
      source,
      mode: onMobile ? "mobile-location" : "desktop-preopen",
      preOpened: !!preOpened,
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
          try { preOpened?.close(); } catch { /* noop */ }
          return;
        }
      }

      if (!validateMinOrder(grand, minOrderTotal)) {
        setSubmitting(false);
        submittingRef.current = false;
        try { preOpened?.close(); } catch { /* noop */ }
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
      ]);

      const orderNum = `ORD-${Math.floor(10000 + Math.random() * 90000)}`;
      let savedOrderId: string | null = null;

      if (!isGuest && currentUser) {
        const result = await placeOrderAtomic({
          _user_id: currentUser.id,
          _total: grand,
          _payment_method: payment,
          _address_id: safeUuidOrNull(selectedAddr?.id),
          _notes: noteParts,
          _service_type: "delivery",
          _delivery_zone: zone.id ?? null,
          _items: lines.map((l) => ({
            product_id: l.product.id,
            product_name: l.product.name,
            product_image: l.product.image ?? null,
            price: l.meta?.unitPrice ?? l.product.price,
            quantity: l.qty,
          })),
          // ---- Outbox payload — RPC owns ALL financial side-effects ----
          _wallet_applied: walletApplied,
          _wallet_shortfall: walletShortfall,
          _secondary_payment: isSplit ? secondaryPayment : null,
          _total_cashback: payment === "wallet" ? totalCashback : 0,
          _change_remainder: showChangeJar ? changeRemainder : 0,
          _save_change: showChangeJar && saveChange && !donateChange,
          _donate_change: showChangeJar && donateChange,
          _tip: tip,
          _promo_code: appliedPromo?.code ?? null,
          _discount: discount,
        });

        if (!result.ok) {
          setSubmitting(false);
          submittingRef.current = false;
          try { preOpened?.close(); } catch { /* noop */ }
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

      clear();
      fireConfetti();

      const openResult: OpenResult = dispatchWhatsApp({
        phone: mainPhone,
        text: mainMessage,
        preOpened,
        onMobile,
        source,
      });

      if (!openResult.ok) {
        console.warn("[checkout] WhatsApp open blocked, success fallback armed", {
          source,
          reason: openResult.reason,
          preOpened: !!preOpened,
          onMobile,
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

      if (openResult.ok) {
        toast.success("تم إرسال طلبك إلى واتساب 🎉");
        navigate({ to: "/order-success", search: { id: orderId, total: orderTotal } });
      }
      setSubmitting(false);
      submittingRef.current = false;
    } catch (err) {
      console.error("[checkout] unexpected error:", err);
      toast.error("حدث خطأ غير متوقّع");
      setSubmitting(false);
      submittingRef.current = false;
      try { preOpened?.close(); } catch { /* noop */ }
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
  };
};

export type CartOrchestrator = ReturnType<typeof useCartOrchestrator>;
