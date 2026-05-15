/**
 * @deprecated Wave P-B (Static Catalog Killer) — `Product` is the legacy
 * bridge type retained only for the deprecated `product` field on
 * `CartLine` and the 8 §2.E external consumers. New code MUST consume
 * `ProductCardVM` from `@/core/catalog/types`.
 */
import type { Product } from "@/core/catalog/legacyProduct.types";
import type { CartLineMeta } from "@/core/orders/runtime/react/CartProvider";
import type { VendorKey } from "@/lib/vendor-menu-config";

export type Addr = {
  id: string;
  label: string;
  city: string;
  district: string | null;
  street: string | null;
  building: string | null;
  is_default: boolean;
};

/**
 * Wave P-B (Static Catalog Killer) — Cart line shape.
 *
 * Canonical (post-P-B): identity + intent + display snapshot.
 *   - `productId`, `variantId?`, `qty`
 *   - `capturedPrice`     — frozen at add-to-cart, immune to upstream drift
 *   - `capturedName`      — display fallback (offline / pre-hydration)
 *   - `capturedImage?`    — display fallback (offline / pre-hydration)
 *
 * Transitional (active until Wave P-B Step B-3 migrates UI leaves):
 *   - `product?: Product` — DEPRECATED bridge so the existing cart UI keeps
 *     compiling and rendering while we migrate. Always populated by
 *     `add(product, ...)` and the legacy-cart migration shim. The engine
 *     layers (`useCartCalculations`, `cartSync`) already prefer
 *     `capturedPrice` over `product.price`. Removed in B-3.
 */
export type CartLine = {
  /** Canonical identity (Wave P-B). Optional during the B-3 transition so legacy shapes still type-check. */
  productId?: string;
  variantId?: string;
  qty: number;
  capturedPrice?: number;
  capturedName?: string;
  capturedImage?: string;
  capturedAt?: string;
  meta?: CartLineMeta;
  /** @deprecated Wave P-B B-3 — read live data via `useCartHydration` instead. */
  product: Product;
};

export type VendorGroup = {
  key: string;
  vendor: VendorKey;
  lines: CartLine[];
  subtotal: number;
  cashback: number;
};

export type SweetsBucket = {
  type: "A" | "B" | "C";
  lines: { product: Product; qty: number; meta?: { date?: string; slot?: string; note?: string } }[];
  subtotal: number;
};

export type AppliedPromo = { code: string; pct: number } | null;

/** Identifiers must match the existing paymentOptions list verbatim. */
export type PaymentId = "wallet" | "cash" | "vodafone-cash" | "instapay";

export const WA_NUMBER = "201080068689";
export const HOME_PRODUCERS_WA = "201080068690";
export const GIFT_BONUS = 200;
