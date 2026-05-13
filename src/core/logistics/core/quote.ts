/**
 * Logistics Quote — pure pricing function.
 *
 * Given a zone, method, subtotal (and optional cart flags), produce a
 * deterministic LogisticsQuote. No React, no DB, no I/O.
 *
 * This is what the PricingEngine sees. The cart adapter is responsible
 * for reading the active zone/method (from LocationContext) and calling
 * this function — keeping the engine 100% domain-pure.
 */
import type {
  LogisticsBlocker,
  LogisticsQuote,
  LogisticsWarning,
  QuoteInput,
} from "./types";
import { HakimGenerativeOverlay } from "@/core/hakim-ai/generative/HakimGenerativeOverlay";

const round2 = (n: number): number => Math.round(n * 100) / 100;

export function computeLogisticsQuote(input: QuoteInput): LogisticsQuote {
  const { zone, method, subtotal, hasPerishables } = input;

  // 1. Free-delivery threshold short-circuit
  const freeDeliveryApplied =
    zone.freeDeliveryThreshold != null &&
    subtotal >= zone.freeDeliveryThreshold &&
    method.feeMultiplier <= 1; // VIP never goes free

  // 2. Surge factor (live load × Hakim forecasting multiplier)
  const liveSurge = zone.surgeActive ? Math.max(1, zone.currentLoadFactor) : 1;
  const forecast = Math.max(
    1,
    input.forecastMultiplier ?? HakimGenerativeOverlay.getZoneSurgeMultiplier(zone.zoneCode),
  );
  const surgeFactor = liveSurge * forecast;
  const surgeApplied = surgeFactor > 1;

  // 3. Fee pipeline: base × method × surge + surcharge
  let deliveryFee = 0;
  if (!freeDeliveryApplied) {
    deliveryFee = zone.baseFee * method.feeMultiplier * surgeFactor + method.flatSurcharge;
    deliveryFee = round2(Math.max(0, deliveryFee));
  }

  // 4. ETA: method override > zone base, then surge multiplier
  const baseEta = method.baseEtaMins > 0 ? method.baseEtaMins : zone.baseEtaMinutes;
  const etaMinutes = Math.round(baseEta * surgeFactor);
  const etaLabel = method.requiresScheduling
    ? method.etaLabelAr
    : surgeApplied
      ? `ضغط عالي - خلال ${etaMinutes} دقيقة`
      : zone.etaLabel || method.etaLabelAr;

  // 5. Warnings + Blockers
  const warnings: LogisticsWarning[] = [];
  const blockers: LogisticsBlocker[] = [];

  if (hasPerishables && !zone.acceptsPerishables) {
    warnings.push({
      code: "perishables_in_remote_zone",
      message: `بعض المنتجات سريعة التلف قد لا تصل بحالة مثالية إلى ${zone.name}.`,
    });
  }
  if (surgeApplied) {
    warnings.push({
      code: "surge_active",
      message: "ضغط حالي على التوصيل — الأسعار والأوقات أعلى من المعتاد.",
    });
  }
  if (method.requiresScheduling) {
    warnings.push({
      code: "scheduled_required",
      message: "يرجى اختيار موعد التوصيل في الخطوة التالية.",
    });
  }

  if (!zone.isActive) {
    blockers.push({ code: "zone_inactive", message: `منطقة ${zone.name} غير متاحة حالياً.` });
  }
  if (subtotal < zone.minOrderValue) {
    blockers.push({
      code: "below_min_order",
      message: `الحد الأدنى للطلب في ${zone.name} هو ${zone.minOrderValue} ج.م`,
      shortfall: round2(zone.minOrderValue - subtotal),
    });
  }

  return {
    zone,
    method,
    subtotal: round2(subtotal),
    deliveryFee,
    freeDeliveryApplied,
    surgeApplied,
    etaMinutes,
    etaLabel,
    warnings,
    blockers,
  };
}
