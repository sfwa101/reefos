/**
 * Salsabil OS — Phase P-1.1.D-α · Sovereign Cart Types.
 *
 * Constitutional source of truth for the legacy-shape cart types
 * (`CartLine`, `CartLineMeta`, `CartActions`, `CartState`). These types
 * survive the V3 transition unchanged so the ~60 legacy consumers compile
 * without modification.
 *
 * The legacy locations (`@/core/orders/runtime/projection`, `@/core/orders/runtime/react/CartProvider`)
 * re-export from this module marked `@deprecated`.
 */

import type { Modifier } from "@/lib/pricingEngine";
/**
 * @deprecated Wave P-B (Static Catalog Killer) — `Product` is the legacy
 * denormalized shape, kept ONLY as a transitional bridge until every UI
 * leaf consumes `ProductCardVM` via `useCartHydration`.
 */
import type { Product } from "@/core/catalog/legacyProduct.types";

export type CartLineMeta = {
  appliedModifiers?: Modifier[];
  properties?: Record<string, unknown>;

  /* legacy fields */
  bookingDate?: string;
  bookingSlot?: string;
  bookingNote?: string;
  variantId?: string;
  addonIds?: string[];
  unitPrice?: number;
  payDeposit?: boolean;
  shipMode?: "split" | "wait";
  kind?: "buy" | "borrow" | "print";
  borrowDuration?: "3d" | "7d" | "14d";
  borrowDays?: number;
  borrowDeposit?: number;
  printConfig?: {
    pages: number;
    copies: number;
    colorMode: "bw" | "color";
    sided: "single" | "double";
    binding: "none" | "spiral" | "plastic" | "thermal";
    fileName?: string;
    filePath?: string;
  };
  prepHours?: number;
};

export type CartLine = {
  productId?: string;
  variantId?: string;
  capturedPrice?: number;
  capturedName?: string;
  capturedImage?: string;
  capturedAt?: string;
  /** @deprecated Wave P-B B-3 — read live data via `useCartHydration` instead. */
  product: Product;
  qty: number;
  meta?: CartLineMeta;
};

export type CartActions = {
  add: (p: Product, qty?: number, meta?: CartLineMeta) => void;
  remove: (productId: string) => void;
  setQty: (productId: string, qty: number) => void;
  updateMeta: (productId: string, meta: CartLineMeta) => void;
  clear: () => void;
  /** Replace entire cart (used by remote-sync & realtime). */
  replaceAll: (lines: CartLine[]) => void;
};

export type CartState = {
  items: Record<string, CartLine>;
  /** productId → lineKey lookup index (rebuilt on every projection tick). */
  productIndex: Record<string, string>;
};
