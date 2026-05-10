/**
 * Hydration Pipeline — يحوّل NormalizedProduct إلى قيم مشتقّة جاهزة للعرض.
 *
 * مسؤوليات:
 *  1. اختيار السعر الفعّال حسب tier المستخدم (base/member/wholesale).
 *  2. حساب نسبة الخصم.
 *  3. اشتقاق badges من الحالات (low_stock, on_sale, new, featured, seasonal).
 *  4. تحديد inStock/isLowStock بناءً على الكميات.
 */
import type { BadgeVM, PriceVM } from "../types";
import type { NormalizedProduct } from "./ProductTransformers";

export type PricingTier = "base" | "member" | "wholesale";

export interface HydrationContext {
  /** Tier المستخدم الحالي. */
  tier: PricingTier;
  /** اللحظة الحالية لتقييم seasonal window. */
  now: Date;
}

export const defaultHydrationContext = (): HydrationContext => ({
  tier: "base",
  now: new Date(),
});

export function derivePrice(p: NormalizedProduct, ctx: HydrationContext): PriceVM {
  let amount = p.basePrice;
  let tier: PricingTier = "base";
  if (ctx.tier === "member" && p.memberPrice !== null) {
    amount = p.memberPrice;
    tier = "member";
  } else if (ctx.tier === "wholesale" && p.wholesalePrice !== null) {
    amount = p.wholesalePrice;
    tier = "wholesale";
  }
  const compareAt =
    p.compareAtPrice !== null && p.compareAtPrice > amount ? p.compareAtPrice : undefined;
  const discountRatio = compareAt ? (compareAt - amount) / compareAt : undefined;
  return { amount, currency: p.currency, compareAt, discountRatio, tier };
}

export function deriveStock(p: NormalizedProduct): { inStock: boolean; isLowStock: boolean } {
  const inStock = p.stockQty > 0;
  const isLowStock = inStock && p.stockQty <= p.lowStockThreshold;
  return { inStock, isLowStock };
}

const isInSeasonalWindow = (p: NormalizedProduct, now: Date): boolean => {
  if (!p.seasonalWindow) return false;
  const start = new Date(p.seasonalWindow.startsAt).getTime();
  const end = new Date(p.seasonalWindow.endsAt).getTime();
  const t = now.getTime();
  return t >= start && t <= end;
};

/**
 * Badges مشتقّة + badges يدوية من DB. لا تكرار، الأولوية للمشتقّة.
 */
export function deriveBadges(
  p: NormalizedProduct,
  price: PriceVM,
  stock: { inStock: boolean; isLowStock: boolean },
  ctx: HydrationContext,
): BadgeVM[] {
  const out = new Map<string, BadgeVM>();

  // مشتقّة (أعلى أولوية)
  if (price.discountRatio && price.discountRatio >= 0.05) {
    out.set("on_sale", { key: "on_sale", tone: "destructive" });
  }
  if (!stock.inStock) {
    out.set("out_of_stock", { key: "out_of_stock", tone: "warning" });
  } else if (stock.isLowStock) {
    out.set("low_stock", { key: "low_stock", tone: "warning" });
  }
  if (p.isFeatured) {
    out.set("featured", { key: "featured", tone: "primary" });
  }
  if (isInSeasonalWindow(p, ctx.now)) {
    out.set("in_season", { key: "in_season", tone: "success" });
  }
  if (p.isPerishable) {
    out.set("fresh", { key: "fresh", tone: "info" });
  }

  // badges يدوية من DB (أدنى أولوية، لا تستبدل المشتقّة)
  for (const key of p.badges) {
    if (!out.has(key)) out.set(key, { key });
  }

  return Array.from(out.values());
}
