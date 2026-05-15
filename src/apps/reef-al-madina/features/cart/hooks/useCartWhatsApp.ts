import { fmtMoney, toLatin } from "@/lib/format";
import { formatBookingShort, isSweetsProduct, fulfillmentTypeFor } from "@/core/commerce/variants/custom-fulfillment-rules";
import {
  buildWaUrl,
  isMobileWaContext,
  type OpenResult,
} from "@/lib/whatsapp";
/** @deprecated Wave P-B B-3 — bridge type for WhatsApp message builder. */
import type { Product } from "@/core/catalog/legacyProduct.types";
import type { CartLineMeta } from "@/core/orders/runtime/react/CartProvider";
import { lineGrandTotal } from "@/core/orders/runtime/lineTotals";

export type WaCartLine = { product: Product; qty: number; meta?: CartLineMeta };

export type BuildWaMessageInput = {
  isGuest: boolean;
  guestName: string;
  guestPhone: string;
  guestAddress: string;
  guestNotes: string;
  customerName: string;
  currentUserEmail: string | null;
  selectedAddr: {
    label?: string | null;
    street?: string | null;
    building?: string | null;
    district?: string | null;
    city?: string | null;
  } | null;
  orderNum: string;
  zoneEtaLabel: string;
  lines: WaCartLine[];
  payment: string;
  paymentLabel: string;
  isSplit: boolean;
  walletApplied: number;
  walletShortfall: number;
  secondaryLabel: string;
  subtotal: number;
  delivery: number;
  billSavings: number;
  tip: number;
  sweetsRules: { hasBooking: boolean; bookingSubtotal: number };
  aggregateDeposit: number;
  payOnDelivery: number;
  grand: number;
  totalCashback: number;
};

const isBookingLine = (lid: string, src: string, sub?: string) =>
  isSweetsProduct(src) && fulfillmentTypeFor(lid, sub) === "C";

const fmtInstantLine = (l: WaCartLine) => {
  const lineTotal = lineGrandTotal(l);
  return `▪️ ${toLatin(l.qty)}x ${l.product.name} (${fmtMoney(lineTotal)})`;
};

const fmtBookingLine = (l: WaCartLine) => {
  const lineTotal = lineGrandTotal(l);
  const day = l.meta?.bookingDate
    ? formatBookingShort(new Date(l.meta.bookingDate))
    : "—";
  return `▪️ ${toLatin(l.qty)}x ${l.product.name} — استلام ${day} (${fmtMoney(lineTotal)})`;
};

const payShortLabel = (payment: string, fallback: string): string =>
  payment === "wallet"
    ? "محفظة"
    : payment === "cash"
      ? "كاش"
      : payment === "instapay"
        ? "انستاباي"
        : payment === "vodafone-cash"
          ? "فودافون كاش"
          : fallback;

/** Builds the full Arabic WhatsApp message body for a checkout. */
export const buildWhatsAppMessage = (i: BuildWaMessageInput): string => {
  const instantItems = i.lines.filter(
    (l) => !isBookingLine(l.product.id, l.product.source, l.product.subCategory),
  );
  const bookingItems = i.lines.filter((l) =>
    isBookingLine(l.product.id, l.product.source, l.product.subCategory),
  );

  const addrLine = i.isGuest
    ? i.guestAddress.trim()
    : i.selectedAddr
      ? [
          i.selectedAddr.label,
          i.selectedAddr.street,
          i.selectedAddr.building,
          i.selectedAddr.district,
          i.selectedAddr.city,
        ]
          .filter(Boolean)
          .join("، ")
      : i.guestNotes || "—";

  const etaLine =
    bookingItems.length > 0 && instantItems.length === 0
      ? "مجدول"
      : `خلال ${i.zoneEtaLabel}`;

  const customerLabel = i.isGuest
    ? i.guestName.trim()
    : i.customerName || (i.currentUserEmail ?? "عميل").split("@")[0];

  const payShort = payShortLabel(i.payment, i.paymentLabel);

  const guestHeader = i.isGuest
    ? `👤 *الاسم:* ${i.guestName.trim()}\n📞 *الهاتف:* ${i.guestPhone.trim()}\n📍 *العنوان:* ${i.guestAddress.trim()}\n\n`
    : "";

  return (
    `مرحباً ريف المدينة 👋\n\n` +
    (i.isGuest
      ? `طلب جديد (ضيف):\n\n${guestHeader}`
      : `أنا ${customerLabel}، وأريد تأكيد طلبي الجديد.\n\n`) +
    `📝 *رقم الطلب:* #${i.orderNum}\n` +
    (i.isGuest ? "" : `📍 *العنوان:* ${addrLine}\n`) +
    `🛵 *وقت التوصيل المتوقع:* ${etaLine}\n\n` +
    (instantItems.length > 0
      ? `🛒 *تفاصيل الطلب:*\n${instantItems.map(fmtInstantLine).join("\n")}\n\n`
      : "") +
    (bookingItems.length > 0
      ? `📅 *حجوزات خاصة:*\n${bookingItems.map(fmtBookingLine).join("\n")}\n\n`
      : "") +
    `💳 *طريقة الدفع:* ${
      i.isSplit
        ? `محفظة (${fmtMoney(i.walletApplied)}) + ${i.secondaryLabel} (${fmtMoney(i.walletShortfall)})`
        : payShort
    }\n\n` +
    `📊 *ملخص الحساب:*\n` +
    `الإجمالي الفرعي: ${toLatin(i.subtotal)} ج.م\n` +
    `التوصيل: ${i.delivery === 0 ? "مجاني" : `${toLatin(i.delivery)} ج.م`}\n` +
    (i.billSavings > 0 ? `وفرت معنا: 🟢 ${toLatin(i.billSavings)} ج.م\n` : "") +
    (i.tip > 0 ? `إكرامية المندوب: ${toLatin(i.tip)} ج.م\n` : "") +
    (i.sweetsRules.hasBooking
      ? `\n🔒 يُدفع الآن من الحجوزات: ${toLatin(i.aggregateDeposit)} ج.م\n` +
        (i.payOnDelivery > 0
          ? `📦 يُحصّل عند التوصيل: ${toLatin(i.payOnDelivery)} ج.م\n`
          : "")
      : "") +
    `\n------------------------\n\n` +
    `💰 *الإجمالي النهائي المطلوب:* *${toLatin(i.grand)} ج.م*\n\n` +
    (i.payment === "wallet" && i.totalCashback > 0
      ? `🎁 كاش باك المحفظة: +${toLatin(i.totalCashback)} ج.م (سيُضاف لرصيدك)\n\n`
      : "") +
    `في انتظار تأكيدكم، شكراً لكم! 🍃`
  );
};

/** Builds the order notes string from the ad-hoc parts. */
export const buildOrderNotes = (parts: (string | null | false | undefined)[]): string | null => {
  const filtered = parts.filter(Boolean) as string[];
  return filtered.length ? filtered.join(" · ") : null;
};

export type DispatchWaInput = {
  phone: string;
  text: string;
  source: string;
};

/**
 * Open WhatsApp via a hidden anchor click. Browsers honor user-initiated
 * anchor clicks even after async work, and unlike `window.location.href`
 * this does NOT navigate the host iframe (so X-Frame-Options can't kill us).
 */
export const dispatchWhatsApp = (i: DispatchWaInput): OpenResult => {
  const url = buildWaUrl({ phone: i.phone, text: i.text });
  console.log("[checkout] dispatching WhatsApp via hidden anchor", { source: i.source, url });
  try {
    const link = document.createElement("a");
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return { ok: true, method: "window-open" };
  } catch (e) {
    console.warn("[checkout] hidden anchor click failed", { source: i.source, error: e });
    return { ok: false, url, text: i.text, reason: "anchor_failed" };
  }
};

// Re-export low-level helpers consumers may still need.
export { isMobileWaContext, buildWaUrl };
