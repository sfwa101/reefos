import { useMemo } from "react";
import type { CartLineMeta } from "@/core/orders/runtime/react/CartProvider";
/** @deprecated Wave P-B B-3 — calculations already prefer `capturedPrice` over `product.price`. */
import type { Product } from "@/core/catalog/legacyProduct.types";
import {
  computeSweetsRules,
  fulfillmentTypeFor,
  isSweetsProduct,
  DEPOSIT_THRESHOLD,
} from "@/core/commerce/variants/custom-fulfillment-rules";
import { toLatin } from "@/lib/format";
import { evaluateCartLineCanonical } from "@/core/orders/runtime/lineTotals";
import { GIFT_BONUS, type SweetsBucket } from "../types/cart.types";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Line = {
  product: Product;
  qty: number;
  meta?: CartLineMeta;
  /** Wave P-B — frozen unit price; preferred over `product.price` for totals. */
  capturedPrice?: number;
};
type Zone = {
  id?: string | null;
  deliveryFee: number;
  freeDeliveryThreshold?: number | null;
  etaLabel?: string;
  codAllowed?: boolean;
};

interface CalcInput {
  lines: Line[];
  total: number;
  zone: Zone;
  appliedPromo: { pct: number } | null;
  tip: number;
  payment: string;
  walletBalance: number;
  trustLimit: number;
  secondaryPayment: string;
}

/**
 * Pure derivation layer for cart totals, sweets segmentation, wallet
 * splitting, change-jar logic, and the "free delivery / gift" progress bar.
 * Extracted from useCartOrchestrator with no behavioral changes.
 */
export const useCartCalculations = ({
  lines,
  total,
  zone,
  appliedPromo,
  tip,
  payment,
  walletBalance,
  trustLimit,
  secondaryPayment,
}: CalcInput) => {
  const subtotal = total;
  const discount = appliedPromo ? Math.round(subtotal * appliedPromo.pct) : 0;
  const FREE_DELIVERY_THRESHOLD = zone.freeDeliveryThreshold ?? Infinity;
  const GIFT_THRESHOLD = isFinite(FREE_DELIVERY_THRESHOLD)
    ? FREE_DELIVERY_THRESHOLD + GIFT_BONUS
    : Infinity;
  const delivery =
    subtotal === 0 ? 0 : subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : zone.deliveryFee;
  const grand = Math.max(0, subtotal - discount + delivery + tip);

  const sweetsBuckets = useMemo(() => {
    const buckets: Record<"A" | "B" | "C", SweetsBucket> = {
      A: { type: "A", lines: [], subtotal: 0 },
      B: { type: "B", lines: [], subtotal: 0 },
      C: { type: "C", lines: [], subtotal: 0 },
    };
    for (const l of lines) {
      if (!isSweetsProduct(l.product.source)) continue;
      const t = fulfillmentTypeFor(l.product.id, l.product.subCategory);
      buckets[t].lines.push({
        product: l.product,
        qty: l.qty,
        meta: {
          date: l.meta?.bookingDate,
          slot: l.meta?.bookingSlot,
          note: l.meta?.bookingNote,
        },
      });
      // Wave P-1.3 — engine-authoritative line subtotal (no manual math).
      buckets[t].subtotal += evaluateCartLineCanonical({
        productId: l.product.id,
        product: l.product,
        qty: l.qty,
        meta: l.meta,
        capturedPrice: l.capturedPrice,
      } as never).breakdown.lineTotal;
    }
    return buckets;
  }, [lines]);

  const sweetsRules = useMemo(
    () => computeSweetsRules(sweetsBuckets.C.subtotal, grand),
    [sweetsBuckets.C.subtotal, grand],
  );

  const bookingLinesMeta = useMemo(() => {
    return lines
      .filter(
        (l) =>
          isSweetsProduct(l.product.source) &&
          fulfillmentTypeFor(l.product.id, l.product.subCategory) === "C",
      )
      .map((l) => {
        // Wave P-1.3 — engine-authoritative subtotal.
        const sub = evaluateCartLineCanonical({
          productId: l.product.id,
          product: l.product,
          qty: l.qty,
          meta: l.meta,
          capturedPrice: l.capturedPrice,
        } as never).breakdown.lineTotal;
        const lineRequired = sub >= DEPOSIT_THRESHOLD;
        const wantsDeposit = lineRequired || (l.meta?.payDeposit ?? true);
        return {
          id: l.product.id,
          subtotal: sub,
          payDeposit: wantsDeposit,
          shipMode: (l.meta?.shipMode ?? "split") as "split" | "wait",
        };
      });
  }, [lines]);

  const aggregateDeposit = useMemo(
    () =>
      bookingLinesMeta.reduce(
        (s, b) => s + (b.payDeposit ? Math.round(b.subtotal * 0.5) : b.subtotal),
        0,
      ),
    [bookingLinesMeta],
  );

  const anyWaitForAll = bookingLinesMeta.some((b) => b.shipMode === "wait");
  const hasInstantSweets = sweetsBuckets.A.lines.length > 0;
  const hasFreshSweets = sweetsBuckets.B.lines.length > 0;
  const hasBooking = sweetsBuckets.C.lines.length > 0;
  const hasNonBookingItems =
    hasInstantSweets ||
    hasFreshSweets ||
    lines.some((l) => !isSweetsProduct(l.product.source));

  const payDeposit = bookingLinesMeta.some((b) => b.payDeposit);

  const payNowAmount = sweetsRules.hasBooking
    ? aggregateDeposit + Math.max(0, grand - sweetsRules.bookingSubtotal)
    : grand;
  const payOnDelivery = Math.max(0, grand - payNowAmount);

  const billSavings =
    discount +
    (subtotal >= FREE_DELIVERY_THRESHOLD && subtotal > 0 ? zone.deliveryFee : 0);

  const isWalletPay = payment === "wallet";
  const effectiveWallet = walletBalance + trustLimit;
  const walletShortfall = isWalletPay ? Math.max(0, grand - effectiveWallet) : 0;
  const walletApplied = isWalletPay ? Math.min(effectiveWallet, grand) : 0;
  const trustUsed = isWalletPay ? Math.max(0, walletApplied - walletBalance) : 0;
  const isSplit = isWalletPay && walletShortfall > 0 && effectiveWallet > 0;

  const cashAmount = !isWalletPay
    ? grand
    : isSplit && secondaryPayment === "cash"
      ? walletShortfall
      : 0;
  const roundedCash = cashAmount > 0 ? Math.ceil(cashAmount / 10) * 10 : 0;
  const changeRemainder = roundedCash - cashAmount;
  const showChangeJar =
    changeRemainder > 0 &&
    changeRemainder <= 10 &&
    [3, 5, 10].some((r) => changeRemainder <= r) &&
    cashAmount > 0;

  const progress = useMemo(() => {
    if (!isFinite(FREE_DELIVERY_THRESHOLD)) {
      return {
        pct: 0,
        label: `🚚 رسوم التوصيل ${toLatin(zone.deliveryFee)} ج.م لمنطقتك`,
        done: false,
      };
    }
    if (subtotal >= GIFT_THRESHOLD) {
      return { pct: 100, label: "🎁 طلبك مؤهل لهدية مفاجئة + توصيل مجاني!", done: true };
    }
    if (subtotal >= FREE_DELIVERY_THRESHOLD) {
      const remain = GIFT_THRESHOLD - subtotal;
      return {
        pct: Math.min(
          100,
          ((subtotal - FREE_DELIVERY_THRESHOLD) /
            (GIFT_THRESHOLD - FREE_DELIVERY_THRESHOLD)) *
            50 +
            50,
        ),
        label: `أضف ${toLatin(remain)} ج.م لتحصل على هدية مفاجئة 🎁`,
        done: false,
      };
    }
    const remain = FREE_DELIVERY_THRESHOLD - subtotal;
    return {
      pct: Math.min(50, (subtotal / FREE_DELIVERY_THRESHOLD) * 50),
      label: `أضف ${toLatin(remain)} ج.م لتحصل على توصيل مجاني 🚚`,
      done: false,
    };
  }, [subtotal, FREE_DELIVERY_THRESHOLD, GIFT_THRESHOLD, zone.deliveryFee]);

  /* ---------------- Shadow compute (PoC, Phase 1) ----------------
   * Run the Universal Pricing Engine in parallel with the legacy
   * calculation. Result is logged ONLY (no UI consumption) so we can
   * audit deltas before flipping the source-of-truth in Phase 2.
   * ---------------------------------------------------------------- */
  useEffect(() => {
    if (lines.length === 0) return;
    try {
      let shadowSubtotal = 0;
      let shadowDeposit = 0;
      for (const l of lines) {
        const base = l.meta?.unitPrice ?? l.capturedPrice ?? l.product.price;
        const mods: Modifier[] = [];
        // Domain-agnostic projection — every preserved meta.appliedModifiers
        // bubbles straight through; otherwise we treat the line as flat.
        const stored = (l.meta as { appliedModifiers?: Modifier[] } | undefined)
          ?.appliedModifiers;
        if (Array.isArray(stored)) mods.push(...stored);
        const br = calculateUniversalPrice(base, mods, l.qty);
        shadowSubtotal += br.lineTotal;
        shadowDeposit += br.depositAmount;
      }
      const shadowDiscount = appliedPromo
        ? calculateUniversalPrice(shadowSubtotal, [
            mod.discount("promo", "كود خصم", appliedPromo.pct, {
              percent: true,
              scope: "line",
            }),
          ]).discountTotal
        : 0;
      const delta = Math.abs(shadowSubtotal - subtotal);
      console.info("[pricing-shadow]", {
        legacy: { subtotal, discount, aggregateDeposit },
        universal: {
          subtotal: shadowSubtotal,
          discount: shadowDiscount,
          deposit: shadowDeposit,
        },
        delta,
      });
    } catch (e) {
      console.warn("[pricing-shadow] failed", e);
    }
    // Only re-run on cart structure / promo changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lines, appliedPromo?.pct]);

  /* ---------------- Cashier Brain shadow (Phase C3) ----------------
   * Fires the sovereign Cashier gateway in parallel with the legacy
   * calculation. Discrepancies are logged ONLY — UI continues to trust
   * `useCartCalculations` until the cutover phase. Failures swallowed.
   *
   * Hardened (Phase C3.1): content-hashed signature + 500ms debounce
   * to prevent render-loop saturation. Logs gated to DEV only.
   * ------------------------------------------------------------------ */
  const cashierPreview = useCashierPreview();
  const cashierMutate = cashierPreview.mutate;
  const [cashierSnapshotHash, setCashierSnapshotHash] = useState<string | null>(
    null,
  );
  const [cashierSnapshotSignature, setCashierSnapshotSignature] = useState<
    string | null
  >(null);

  const cashierItems = useMemo(
    () =>
      lines.length === 0
        ? []
        : lines
            .filter((l) => UUID_RE.test(l.product.id))
            .map((l) => ({ id: l.product.id, qty: l.qty })),
    [lines],
  );
  const allLinesAreUuid = cashierItems.length === lines.length;
  const cartSignature = useMemo(() => {
    if (lines.length === 0) return "";
    if (!allLinesAreUuid || cashierItems.length === 0) return "";
    return JSON.stringify(cashierItems.map((i) => [i.id, i.qty]));
  }, [cashierItems, allLinesAreUuid, lines.length]);

  useEffect(() => {
    if (!cartSignature) return;
    const timer = setTimeout(() => {
      cashierMutate(
        { items: cashierItems, context: { member_tier: "guest" } },
        {
          onSuccess: (snapshot) => {
            // Phase C5 — capture the latest authoritative snapshot hash so
            // the checkout submit can hand it to the Sovereign Price Judge.
            setCashierSnapshotHash(snapshot.snapshot_hash);
            setCashierSnapshotSignature(cartSignature);

            const delta = Math.abs(snapshot.totals.grand_total - grand);
            if (delta > 0.01) {
              if (import.meta.env.DEV) {
                console.warn(
                  `[CASHIER-SHADOW-MISMATCH] Legacy: ${grand}, Brain: ${snapshot.totals.grand_total}, Hash: ${snapshot.snapshot_hash}`,
                  {
                    legacy: { subtotal, discount, delivery, grand },
                    brain: snapshot.totals,
                  },
                );
              }
            } else if (import.meta.env.DEV) {
              console.info("[cashier-shadow] match", {
                grand,
                hash: snapshot.snapshot_hash,
              });
            }
          },
          onError: (err) => {
            if (import.meta.env.DEV) {
              console.warn("[cashier-shadow] preview failed:", err.message);
            }
          },
        },
      );
    }, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartSignature]);

  return {
    subtotal,
    discount,
    delivery,
    grand,
    sweetsBuckets,
    sweetsRules,
    bookingLinesMeta,
    aggregateDeposit,
    anyWaitForAll,
    hasInstantSweets,
    hasFreshSweets,
    hasBooking,
    hasNonBookingItems,
    payDeposit,
    payNowAmount,
    payOnDelivery,
    billSavings,
    isWalletPay,
    walletShortfall,
    walletApplied,
    trustUsed,
    isSplit,
    cashAmount,
    roundedCash,
    changeRemainder,
    showChangeJar,
    progress,
    FREE_DELIVERY_THRESHOLD,
    /**
     * Phase C5 — latest authoritative `snapshot_hash` from CashierBrain.
     * `null` until the first preview lands or whenever the cart mutates
     * faster than the 500ms debounce can confirm. Only valid when
     * `cashierSnapshotFresh` is true.
     */
    cashierSnapshotHash,
    /** True when the captured hash matches the current cart signature. */
    cashierSnapshotFresh:
      cashierSnapshotHash !== null &&
      cashierSnapshotSignature === cartSignature &&
      cartSignature !== "",
    /** Items the server validated (UUID-only product ids). */
    cashierSnapshotItems: cashierItems,
  };
};
