/**
 * FlashPriceResolver — Time-Aware Pricing Core
 *
 * Resolves the *current* price of a product by checking active flash sales
 * and flash deals against `Date.now()`. If an offer's window has expired
 * (or hasn't started yet), the discount is IGNORED entirely and the
 * original `product.price` is returned — even if the product is sitting
 * in the customer's cart with a previously-cached discounted price.
 *
 * This guarantees the UI, cart, and checkout always reflect *real* prices
 * at the moment of computation. Server-side validation in
 * `place_order_atomic_v2` re-runs the same logic to prevent time-lag
 * exploits where a client tries to submit an old discounted price after
 * the flash window has closed.
 */

export type FlashSaleRow = {
  id: string;
  starts_at: string | null;
  ends_at: string | null;
  active: boolean;
  discount_pct: number | null;
};

export type FlashSaleProductLink = {
  flash_sale_id: string;
  product_id: string;
  override_discount_pct: number | null;
};

export type FlashDealRow = {
  id: string;
  product_id: string;
  start_time: string | null;
  end_time: string | null;
  discount_pct: number | null;
  active: boolean;
};

export type ResolvableProduct = {
  id: string;
  price: number;
  oldPrice?: number | null;
};

export type FlashPriceResult = {
  finalPrice: number;
  originalPrice: number;
  appliedDiscountPct: number;
  source: "flash_sale" | "flash_deal" | "static_old_price" | "none";
  expiresAt: Date | null;
};

const isWithinWindow = (
  startsAt: string | null,
  endsAt: string | null,
  now: number,
): boolean => {
  if (startsAt) {
    const start = new Date(startsAt).getTime();
    if (Number.isFinite(start) && now < start) return false;
  }
  if (endsAt) {
    const end = new Date(endsAt).getTime();
    if (Number.isFinite(end) && now >= end) return false;
  }
  return true;
};

const applyPct = (price: number, pct: number): number => {
  const clamped = Math.max(0, Math.min(100, pct));
  return Math.round(price * (1 - clamped / 100) * 100) / 100;
};

export const resolveFlashPrice = (
  product: ResolvableProduct,
  flashSales: ReadonlyArray<FlashSaleRow>,
  flashSaleLinks: ReadonlyArray<FlashSaleProductLink>,
  flashDeals: ReadonlyArray<FlashDealRow>,
  now: number = Date.now(),
): FlashPriceResult => {
  const original = product.price;

  // 1) Per-product flash deals (highest specificity)
  const liveDeal = flashDeals.find(
    (d) =>
      d.active &&
      d.product_id === product.id &&
      d.discount_pct !== null &&
      isWithinWindow(d.start_time, d.end_time, now),
  );
  if (liveDeal && liveDeal.discount_pct !== null) {
    return {
      finalPrice: applyPct(original, liveDeal.discount_pct),
      originalPrice: original,
      appliedDiscountPct: liveDeal.discount_pct,
      source: "flash_deal",
      expiresAt: liveDeal.end_time ? new Date(liveDeal.end_time) : null,
    };
  }

  // 2) Flash sale that contains this product
  const productLinks = flashSaleLinks.filter((l) => l.product_id === product.id);
  for (const link of productLinks) {
    const sale = flashSales.find((s) => s.id === link.flash_sale_id);
    if (!sale || !sale.active) continue;
    if (!isWithinWindow(sale.starts_at, sale.ends_at, now)) continue;
    const pct = link.override_discount_pct ?? sale.discount_pct;
    if (pct === null) continue;
    return {
      finalPrice: applyPct(original, pct),
      originalPrice: original,
      appliedDiscountPct: pct,
      source: "flash_sale",
      expiresAt: sale.ends_at ? new Date(sale.ends_at) : null,
    };
  }

  // 3) Fallback: static `oldPrice` from the catalog (always valid, no expiry)
  if (product.oldPrice && product.oldPrice > original) {
    const pct = ((product.oldPrice - original) / product.oldPrice) * 100;
    return {
      finalPrice: original,
      originalPrice: product.oldPrice,
      appliedDiscountPct: Math.round(pct * 10) / 10,
      source: "static_old_price",
      expiresAt: null,
    };
  }

  // 4) No active offer — return original price untouched.
  return {
    finalPrice: original,
    originalPrice: original,
    appliedDiscountPct: 0,
    source: "none",
    expiresAt: null,
  };
};

/**
 * Server-side guard helper. Compares a client-submitted price against the
 * authoritative resolver result. Returns true if the submitted price is
 * still valid (matches or is higher than the current real price). Anything
 * lower means the client is replaying an expired discount and the order
 * MUST be rejected.
 */
export const isSubmittedPriceValid = (
  submittedPrice: number,
  product: ResolvableProduct,
  flashSales: ReadonlyArray<FlashSaleRow>,
  flashSaleLinks: ReadonlyArray<FlashSaleProductLink>,
  flashDeals: ReadonlyArray<FlashDealRow>,
  now: number = Date.now(),
): boolean => {
  const real = resolveFlashPrice(product, flashSales, flashSaleLinks, flashDeals, now);
  // Tolerate 1-cent rounding noise.
  return submittedPrice + 0.01 >= real.finalPrice;
};
