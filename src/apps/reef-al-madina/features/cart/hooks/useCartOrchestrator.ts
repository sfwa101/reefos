import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";

import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { useLocationStatic as useLocation } from "@/context/LocationContext";
import { getCheckoutContextFn, clearMyCartFn } from "@/core/orders/cart.functions";
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
import { allocateOrderInventory } from "./useCartCheckoutRpc";
import { callSovereignCheckout, newIdempotencyKey } from "@/core/hakim-ai/hooks/useSovereignCheckout";
import { callTayseerPayment } from "@/hooks/useTayseerRapidPay";
import { createTraceId, logSovereignEvent } from "@/core/system/observability/SovereignTracingGateway";
import { buildWhatsAppMessage, buildOrderNotes, dispatchWhatsApp } from "./useCartWhatsApp";
import { useSharedCartAdapter } from "./useSharedCartAdapter";
import { useCartCalculations } from "./useCartCalculations";
import { useCartVendorGrouping } from "./useCartVendorGrouping";
import { useSystemSetting } from "@/hooks/useSystemSettings";
import { useCartCheckoutRules, useCartHasErrors } from "@/core/orders/runtime/react/CartProvider";
/** @deprecated Wave P-B B-3 — capability check; will move to `vm.capabilities.includes("perishable")` in B-7+. */
import { isPerishable } from "@/core/catalog/legacyProduct.types";
import { computeLogisticsQuote } from "@/core/logistics/core/quote";
import { useDefaultDeliveryMethod } from "@/apps/reef-al-madina/features/logistics/hooks/useDefaultDeliveryMethod";
import { legacyZoneToLogisticsZone } from "@/apps/reef-al-madina/features/logistics/adapters/legacyZoneToLogisticsZone";
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
  // Phase 38 — Sovereign Control Plane kill switch.
  const { value: paymentsEnabled } = useSystemSetting<boolean>("payments_enabled", true);

  const { promo, setPromo, appliedPromo, applyPromo, minOrderTotal } =
    useCartValidation(total);

  const [tip, setTip] = useState(0);
  const [addresses, setAddresses] = useState<Addr[]>([]);
  const [addrId, setAddrId] = useState<string>("");
  const [guestNotes, setGuestNotes] = useState("");
  const [payment, setPayment] = useState<string>("wallet");
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  // Phase 47-Alt — Sentinel client-side cooldown. After any submit attempt
  // (success or failure) we reject re-submits for 3s as a defense-in-depth
  // burst guard layered on top of the in-flight `submittingRef` lock and
  // the server-side idempotency key.
  const lastSubmitAtRef = useRef<number>(0);
  const SUBMIT_COOLDOWN_MS = 3_000;
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
      // Phase 52 — Tayseer Kernel Integration. Reads balance + credit_limit
      // strictly from the canonical `public.wallets` table (EGP). The legacy
      // `wallet_balances` + `user_trust_limit` path is retired (Law 2).
      // Wave P-D Phase D-2 — routed through the sanctioned Cart Gateway
      // (`getCheckoutContextFn`) instead of direct `supabase.from(...)`.
      try {
        const ctx = await getCheckoutContextFn();
        const list = (ctx.addresses as Addr[]) ?? [];
        setAddresses(list);
        const def = list.find((a) => a.is_default) ?? list[0];
        if (def) setAddrId(def.id);
        setWalletBalance(Number(ctx.wallet?.balance ?? 0));
        setTrustLimit(Number(ctx.wallet?.credit_limit ?? 0));
        setCustomerName(ctx.fullName);
      } catch (e) {
        console.warn("[cart] failed to hydrate checkout context:", e);
      }
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
  // Phase U — single source of truth for pricing errors; consumed by Cart page
  // via `o.hasPricingErrors` so the Cart shell no longer subscribes separately.
  const hasPricingErrors = useCartHasErrors();

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
      console.warn("[checkout] duplicate submit blocked (in-flight)");
      return;
    }
    const sinceLast = Date.now() - lastSubmitAtRef.current;
    if (sinceLast < SUBMIT_COOLDOWN_MS) {
      const wait = Math.ceil((SUBMIT_COOLDOWN_MS - sinceLast) / 1000);
      toast.error(`لقد تجاوزت حد الطلبات المسموح به، يرجى المحاولة بعد ${wait} ثانية`);
      return;
    }
    if (!paymentsEnabled) {
      toast.error("نظام الدفع متوقف مؤقتاً للتحديث");
      return;
    }
    lastSubmitAtRef.current = Date.now();

    const source = "CartCheckoutActions:onCheckout→useCartOrchestrator.checkoutWA";
    console.info("[checkout] WhatsApp checkout invoked", {
      source,
      cartLines: lines.length,
    });
    // Phase 38 — distributed tracing: one trace_id per submit attempt; the
    // same id is reused for `checkout_attempt` and (on success) `checkout_success`.
    const traceId = createTraceId();
    const checkoutIdempotencyKey = newIdempotencyKey();
    void logSovereignEvent({
      trace_id: traceId,
      event_domain: "checkout",
      event_type: "checkout_attempt",
      payload: {
        idempotency_key: checkoutIdempotencyKey,
        line_count: lines.length,
        grand: effectiveGrand,
        payment,
      },
    });
    submittingRef.current = true;
    setSubmitting(true);
    const minLoading = new Promise<void>((r) => setTimeout(r, 1000));
    try {
      // Wave P-D Phase D-2 — `useAuth` is the single source of truth for the
      // signed-in user; the orchestrator no longer reaches into
      // `supabase.auth.getSession()` directly.
      const currentUser = user ?? null;
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

      // Phase 52 — guard checks Smart Balance Reserve (balance + credit_limit).
      // Tayseer customers may pay on credit up to their assigned limit.
      if (
        payment === "wallet" &&
        effectiveGrand > (walletBalance + trustLimit) &&
        !isSplit
      ) {
        toast.error("الرصيد المتاح + حد تيسير لا يكفي، يرجى اختيار طريقة دفع للمبلغ المتبقي");
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
        // Phase 10.2 — Sovereign Router: a single atomic RPC creates the
        // master order, splits per vendor via the Decentralized Inventory
        // Matrix, decrements stock, and fans out fulfillment nodes/items.
        const sovereignItems = lines.map((l) => ({
          product_id: l.product.id,
          quantity: l.qty,
        }));

        const deliveryInfo = {
          address_id: safeUuidOrNull(selectedAddr?.id),
          address_label: selectedAddr?.label ?? null,
          city: selectedAddr?.city ?? null,
          district: selectedAddr?.district ?? null,
          street: selectedAddr?.street ?? null,
          building: selectedAddr?.building ?? null,
          phone: isGuest ? guestPhone : (currentUser?.phone ?? null),
          recipient_name: isGuest ? guestName : customerName,
          zone: zone.id ?? null,
          lat: null as number | null,
          lng: null as number | null,
          notes: noteParts,
          service_type: "delivery",
          // legacy header passthrough (vendors may surface this)
          payment_method: payment,
          total: effectiveGrand,
          delivery_fee: effectiveDelivery,
          eta_minutes: logisticsQuote?.etaMinutes ?? null,
          is_gift: giftMode,
          gift_message: giftMode ? (giftMessage || null) : null,
        };

        try {
          // Phase C5 — Sovereign Price Validation. Refuse to submit until
          // the Cashier Brain has confirmed the cart's authoritative hash.
          if (!calc.cashierSnapshotFresh || !calc.cashierSnapshotHash) {
            toast.error(
              "عفواً، لم يكتمل احتساب السعر السيادي بعد. يرجى الانتظار لحظة وإعادة المحاولة.",
            );
            setSubmitting(false);
            submittingRef.current = false;
            return;
          }
          // Phase 36 Titanium Shield — idempotent checkout. Phase 38 reuses
          // the same key the trace event captured so success can be correlated.
          savedOrderId = await callSovereignCheckout({
            customer_id: currentUser.id,
            cart_items: sovereignItems,
            delivery_info: deliveryInfo,
            idempotency_key: checkoutIdempotencyKey,
            expected_snapshot_hash: calc.cashierSnapshotHash,
            cashier_context: { member_tier: "guest" },
          });
        } catch (e) {
          const msg = e instanceof Error ? e.message : "حدث خطأ أثناء تسجيل الطلب";
          console.error("[checkout] process_checkout_sovereign failed", e);
          void logSovereignEvent({
            trace_id: traceId,
            event_domain: "checkout",
            event_type: "checkout_failed",
            payload: { idempotency_key: checkoutIdempotencyKey, message: msg },
          });
          toast.error(msg);
          setSubmitting(false);
          submittingRef.current = false;
          return;
        }

        if (savedOrderId) {
          await allocateOrderInventory(savedOrderId, zone.id);

          // Phase 52 — Tayseer Rapid Pay settlement. If the customer chose
          // the wallet method, atomically settle the order against the
          // canonical Tayseer ledger (balance + credit_limit). The cart UI
          // waits for this RPC before declaring success, so the order's
          // payment_status flips to 'paid' inside the same user action.
          // Phase 54 — Wakalah lines are not yet owned; never deduct upfront.
          const wakalahTotal = sumCanonicalGrandTotalsWhere(lines, (l) => {
            const mode = (l.meta?.properties as Record<string, unknown> | undefined)?.procurement_mode;
            return mode === "wakalah";
          });
          const tayseerCharge = Math.max(0, walletApplied - wakalahTotal);
          if (payment === "wallet" && tayseerCharge > 0) {
            try {
              await callTayseerPayment({
                order_id: savedOrderId,
                amount: tayseerCharge,
              });
              toast.success("تم الدفع بنجاح من محفظة تيسير");
              void logSovereignEvent({
                trace_id: traceId,
                event_domain: "wallet",
                event_type: "tayseer_payment_success",
                payload: { order_id: savedOrderId, amount: tayseerCharge, wakalah_excluded: wakalahTotal },
              });
            } catch (e) {
              const msg = e instanceof Error ? e.message : "فشل الدفع من محفظة تيسير";
              console.error("[checkout] process_tayseer_payment failed", e);
              void logSovereignEvent({
                trace_id: traceId,
                event_domain: "wallet",
                event_type: "tayseer_payment_failed",
                payload: { order_id: savedOrderId, amount: tayseerCharge, message: msg },
              });
              toast.error(msg);
              setSubmitting(false);
              submittingRef.current = false;
              return;
            }
          }

          void logSovereignEvent({
            trace_id: traceId,
            event_domain: "checkout",
            event_type: "checkout_success",
            payload: {
              idempotency_key: checkoutIdempotencyKey,
              order_id: savedOrderId,
              grand: effectiveGrand,
            },
          });
        }
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
      // 1) Wipe local state so the UI reflects an empty cart instantly.
      clear();
      // 2) Hard-delete the persisted rows synchronously to defeat the
      //    debounced background push and any realtime refetch race that
      //    would otherwise resurrect the cart on the next page load.
      if (currentUser?.id) {
        try {
          await clearMyCartFn();
        } catch (e) {
          console.warn("[checkout] failed to purge remote cart_items:", e);
        }
      }
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

  return useMemo(() => ({
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
    paymentsEnabled,
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
    giftRecipientName,
    setGiftRecipientName,
    giftRecipientPhone,
    setGiftRecipientPhone,
    giftRecipientAddress,
    setGiftRecipientAddress,
    charity,
    setCharity,
    charityCauseId,
    setCharityCauseId,
    // Phase U — consolidated pricing-errors flag
    hasPricingErrors,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [
    lines, count, user, zone,
    addresses, addrId, selectedAddr, guestNotes,
    guestName, guestPhone, guestAddress, customerName,
    promo, appliedPromo, tip,
    payment, secondaryPayment, paymentLabel, secondaryLabel,
    walletBalance, trustLimit, walletApplied, walletShortfall, trustUsed,
    isWalletPay, isSplit, showRecharge, saveChange, donateChange,
    showChangeJar, roundedCash, changeRemainder,
    subtotal, discount, delivery, grand, billSavings, minOrderTotal, progress,
    sweetsBuckets, sweetsRules, engineRules,
    aggregateDeposit, payOnDelivery, payDeposit, anyWaitForAll,
    hasBooking, hasNonBookingItems, hasInstantSweets, hasFreshSweets,
    vendorGroups, instantGroups, scheduledGroups, showFulfillmentSections,
    isMultiVendor, totalCashback, groupIsMixedScheduled, crossSell,
    submitting, waFallback, paymentsEnabled,
    isSharedMode, sharedCartId, shared,
    logisticsQuote, logisticsBlocked, effectiveDelivery, effectiveGrand, codAllowed,
    giftMode, giftMessage, giftRecipientName, giftRecipientPhone, giftRecipientAddress,
    charity, charityCauseId,
    hasPricingErrors,
  ]);
};

export type CartOrchestrator = ReturnType<typeof useCartOrchestrator>;
