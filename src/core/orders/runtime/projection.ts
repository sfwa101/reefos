/**
 * Salsabil OS — Phase P-1.1.D-β · Sovereign Cart Projection.
 *
 * The Zustand store (`useCartProjectionStore`) is a pure read-only PROJECTION of the
 * Sovereign {@link cartRuntime}. ALL mutating intents flow into the runtime;
 * the store mirrors `cartRuntime.getState()` and writes the projection to
 * `localStorage` so the cart survives reloads.
 *
 * This module owns the projection bridge. The legacy file
 * `src/store/useCartProjectionStore.ts` is now a 100%-logic-free re-export shim
 * pointing at this module.
 */

import { useEffect, useMemo, useRef } from "react";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { useShallow } from "zustand/react/shallow";

import {
  cartRuntime,
  computeLineKey as computeRuntimeLineKey,
  type CartLineKindData,
  type CartLineDisplay,
  type CartRuntimeLine,
  type CartRuntimeState,
  type AddCartItemIntent,
} from "@/core/orders/runtime/CartRuntime";
import type {
  ProductFinancialDNA,
  CartLineModifier,
} from "@/core/cashier/domain/types";
import type { Product } from "@/core/catalog/legacyProduct.types";
import type { Modifier } from "@/core/commerce/pricing/modifiers";
import type {
  CartLine,
  CartLineMeta,
  CartActions,
  CartState,
} from "@/core/orders/runtime/types";

// ---------------------------------------------------------------------------
// Stable line identity (mirrors cartSync.ts)
// ---------------------------------------------------------------------------

export const lineKey = (l: {
  product: { id: string };
  meta?: CartLineMeta;
}): string =>
  computeRuntimeLineKey({
    productId: l.product.id,
    kindData: legacyMetaToKindData(l.product.id, l.meta),
  });

// ---------------------------------------------------------------------------
// Legacy ⇄ Sovereign translators (kernel-minimalism preserved).
// ---------------------------------------------------------------------------

const FALLBACK_CART_IMG =
  "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23f3f4f6'/%3E%3C/svg%3E";

function legacyMetaToKindData(
  _productId: string,
  meta: CartLineMeta | undefined,
): CartLineKindData {
  const k = meta?.kind ?? "buy";
  if (k === "borrow") {
    return {
      kind: "borrow",
      duration: meta?.borrowDuration ?? "7d",
      days: meta?.borrowDays,
      deposit: meta?.borrowDeposit,
    };
  }
  if (k === "print" && meta?.printConfig) {
    return { kind: "print", config: meta.printConfig };
  }
  if (meta?.bookingDate) {
    return {
      kind: "booking",
      date: meta.bookingDate,
      slot: meta.bookingSlot,
      note: meta.bookingNote,
      prepHours: meta.prepHours,
      payDeposit: meta.payDeposit,
    };
  }
  return {
    kind: "buy",
    variantId: meta?.variantId,
    addonIds: meta?.addonIds,
  };
}

function kindDataToLegacyMeta(
  kindData: CartLineKindData,
  base: CartLineMeta | undefined,
): CartLineMeta {
  const out: CartLineMeta = { ...(base ?? {}) };
  switch (kindData.kind) {
    case "buy":
      out.kind = "buy";
      if (kindData.variantId !== undefined) out.variantId = kindData.variantId;
      if (kindData.addonIds !== undefined)
        out.addonIds = Array.from(kindData.addonIds);
      break;
    case "booking":
      out.bookingDate = kindData.date;
      if (kindData.slot !== undefined) out.bookingSlot = kindData.slot;
      if (kindData.note !== undefined) out.bookingNote = kindData.note;
      if (kindData.prepHours !== undefined) out.prepHours = kindData.prepHours;
      if (kindData.payDeposit !== undefined) out.payDeposit = kindData.payDeposit;
      break;
    case "borrow":
      out.kind = "borrow";
      out.borrowDuration = kindData.duration;
      if (kindData.days !== undefined) out.borrowDays = kindData.days;
      if (kindData.deposit !== undefined) out.borrowDeposit = kindData.deposit;
      break;
    case "print":
      out.kind = "print";
      out.printConfig = { ...kindData.config };
      break;
  }
  return out;
}

function productToDna(
  product: Product,
  meta: CartLineMeta | undefined,
): ProductFinancialDNA {
  return {
    currency: "EGP",
    base_price: meta?.unitPrice ?? product.price ?? 0,
  };
}

function metaModifiersToCartLineModifiers(
  modifiers: ReadonlyArray<Modifier> | undefined,
): ReadonlyArray<CartLineModifier> | undefined {
  if (!modifiers || modifiers.length === 0) return undefined;
  return modifiers.map((m) => ({
    id: m.id,
    label: m.label,
    unit_price_delta: m.amount,
  }));
}

function captureDisplay(
  product: Product,
  meta: CartLineMeta | undefined,
): CartLineDisplay {
  return {
    capturedName: product.name,
    capturedImage: product.image,
    capturedPrice: meta?.unitPrice ?? product.price,
    capturedAt: new Date().toISOString(),
    unit: product.unit,
  };
}

function legacyAddToIntent(
  product: Product,
  qty: number,
  meta: CartLineMeta | undefined,
): AddCartItemIntent {
  const kindData = legacyMetaToKindData(product.id, meta);
  return {
    lineId: computeRuntimeLineKey({ productId: product.id, kindData }),
    productId: product.id,
    dna: productToDna(product, meta),
    qty,
    modifiers: metaModifiersToCartLineModifiers(meta?.appliedModifiers),
    name: product.name,
    kindData,
    display: captureDisplay(product, meta),
    extensions: meta?.properties as Record<string, never> | undefined,
  };
}

function legacyLineToIntent(line: CartLine): AddCartItemIntent {
  const product = line.product;
  const meta = line.meta;
  const kindData = legacyMetaToKindData(product.id, meta);
  return {
    lineId: computeRuntimeLineKey({ productId: product.id, kindData }),
    productId: product.id,
    dna: productToDna(product, meta),
    qty: line.qty,
    modifiers: metaModifiersToCartLineModifiers(meta?.appliedModifiers),
    name: line.capturedName ?? product.name,
    kindData,
    display: {
      capturedName: line.capturedName ?? product.name,
      capturedImage: line.capturedImage ?? product.image,
      capturedPrice: line.capturedPrice ?? meta?.unitPrice ?? product.price,
      capturedAt: line.capturedAt,
      unit: product.unit,
    },
    extensions: meta?.properties as Record<string, never> | undefined,
  };
}

// ---------------------------------------------------------------------------
// Persistent projection storage.
// ---------------------------------------------------------------------------

const STORAGE_KEY = "reef-cart-v2";
const memoryStore: Record<string, string> = {};
const safeStorage = createJSONStorage<CartState>(() => ({
  getItem: (key) => {
    try {
      const v = localStorage.getItem(key);
      return v ?? memoryStore[key] ?? null;
    } catch {
      return memoryStore[key] ?? null;
    }
  },
  setItem: (key, value) => {
    memoryStore[key] = value;
    try {
      localStorage.setItem(key, value);
    } catch {
      /* ignore */
    }
  },
  removeItem: (key) => {
    delete memoryStore[key];
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  },
}));

// ---------------------------------------------------------------------------
// Projection: CartRuntimeLine → legacy CartLine (read-only mirror).
// ---------------------------------------------------------------------------

function runtimeLineToCartLine(rl: CartRuntimeLine): CartLine {
  const display = rl.display ?? {};
  const meta = kindDataToLegacyMeta(rl.kindData, {
    properties: rl.extensions as Record<string, unknown> | undefined,
    unitPrice: display.capturedPrice ?? rl.dna.base_price,
  });
  const productStub: Product = {
    id: rl.productId,
    name: display.capturedName ?? rl.name ?? "",
    price: display.capturedPrice ?? rl.dna.base_price ?? 0,
    image: display.capturedImage ?? FALLBACK_CART_IMG,
    unit: display.unit ?? "",
    category: "general",
    source: "supermarket",
  } as Product;
  return {
    productId: rl.productId,
    variantId: rl.kindData.kind === "buy" ? rl.kindData.variantId : undefined,
    capturedPrice: display.capturedPrice ?? rl.dna.base_price,
    capturedName: display.capturedName ?? rl.name,
    capturedImage: display.capturedImage,
    capturedAt: display.capturedAt,
    product: productStub,
    qty: rl.qty,
    meta,
  };
}

function projectRuntimeState(state: CartRuntimeState): CartState {
  const items: Record<string, CartLine> = {};
  const productIndex: Record<string, string> = {};
  for (const rl of state.lines) {
    const key = rl.lineId;
    items[key] = runtimeLineToCartLine(rl);
    if (!(rl.productId in productIndex)) productIndex[rl.productId] = key;
  }
  return { items, productIndex };
}

// ---------------------------------------------------------------------------
// Persisted-shape rehydration → CartRuntime (one-shot at boot).
// ---------------------------------------------------------------------------

/**
 * @deprecated Pre-V3 persisted shape lifter, retained for one wave so existing
 * `localStorage` carts survive the projection inversion.
 */
export const migrateLegacyCartShape = (
  items: Record<string, CartLine>,
): Record<string, CartLine> => {
  const out: Record<string, CartLine> = {};
  for (const [k, raw] of Object.entries(items)) {
    if (!raw || typeof raw !== "object") continue;
    const line = raw as CartLine;
    if (!line.product || typeof line.product.id !== "string") {
      const id = line.productId;
      if (!id) continue;
      out[k] = {
        ...line,
        product: {
          id,
          name: line.capturedName ?? "",
          price: line.capturedPrice ?? 0,
          image: line.capturedImage ?? FALLBACK_CART_IMG,
          unit: "",
          category: "general",
          source: "supermarket",
        } as Product,
      };
      continue;
    }
    out[k] = line;
  }
  return out;
};

// ---------------------------------------------------------------------------
// Store — read-only projection.
// ---------------------------------------------------------------------------

export const useCartProjectionStore = create<CartState>()(
  persist<CartState>(
    () => ({
      items: {} as Record<string, CartLine>,
      productIndex: {} as Record<string, string>,
    }),
    {
      name: STORAGE_KEY,
      storage: safeStorage,
      partialize: (s: CartState) =>
        ({
          items: Object.fromEntries(
            Object.entries(s.items).map(([k, l]) => [
              k,
              {
                productId: l.productId ?? l.product?.id,
                variantId: l.variantId,
                qty: l.qty,
                capturedPrice: l.capturedPrice ?? l.product?.price,
                capturedName: l.capturedName ?? l.product?.name,
                capturedImage:
                  typeof l.capturedImage === "string"
                    ? l.capturedImage
                    : typeof l.product?.image === "string"
                      ? l.product.image
                      : undefined,
                capturedAt: l.capturedAt,
                meta: l.meta,
              } as CartLine,
            ]),
          ),
          productIndex: {} as Record<string, string>,
        }) satisfies CartState,
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        state.items = migrateLegacyCartShape(state.items);
        const intents: AddCartItemIntent[] = Object.values(state.items).map(
          (l: CartLine) => legacyLineToIntent(l),
        );
        cartRuntime.replaceAll(intents);
      },
    },
  ),
);

// ---------------------------------------------------------------------------
// Runtime → Store projection bridge (single subscriber, process-wide).
// ---------------------------------------------------------------------------

let bridgeInstalled = false;
function ensureProjectionBridge(): void {
  if (bridgeInstalled) return;
  bridgeInstalled = true;
  cartRuntime.subscribe((state) => {
    const projected = projectRuntimeState(state);
    useCartProjectionStore.setState(projected, true);
  });
}
ensureProjectionBridge();

// ---------------------------------------------------------------------------
// Selector hooks — granular, read-only.
// ---------------------------------------------------------------------------

export const useCartActions = (): CartActions => {
  const ref = useRef<CartActions | null>(null);
  if (ref.current === null) {
    ref.current = {
      add: (product, qty = 1, meta) => {
        cartRuntime.add(legacyAddToIntent(product, qty, meta));
      },
      remove: (productId) => {
        cartRuntime.removeByProductId(productId);
      },
      setQty: (productId, qty) => {
        if (qty <= 0) {
          cartRuntime.removeByProductId(productId);
          return;
        }
        cartRuntime.setQtyByProductId(productId, qty);
      },
      updateMeta: (productId, meta) => {
        const kindData = legacyMetaToKindData(productId, meta);
        cartRuntime.updateMetaByProductId(productId, {
          kindData,
          extensions: meta.properties as Record<string, never> | undefined,
        });
      },
      clear: () => {
        cartRuntime.clear();
      },
      replaceAll: (lines) => {
        cartRuntime.replaceAll(lines.map((l) => legacyLineToIntent(l)));
      },
    };
  }
  return ref.current;
};

/**
 * Imperative bridge for non-React call sites (realtime sync, server effects).
 */
export function replaceCartLines(lines: ReadonlyArray<CartLine>): void {
  cartRuntime.replaceAll(lines.map((l) => legacyLineToIntent(l)));
}

export const useCartLineQty = (productId: string): number =>
  useCartProjectionStore((s) => {
    const key = s.productIndex[productId];
    return key ? (s.items[key]?.qty ?? 0) : 0;
  });

export const useCartTotalItems = (): number =>
  useCartProjectionStore((s) => {
    let n = 0;
    for (const k in s.items) n += s.items[k].qty;
    return n;
  });

let _linesCacheItems: Record<string, CartLine> | null = null;
let _linesCacheArr: CartLine[] = [];
const linesArraySelector = (s: CartState): CartLine[] => {
  if (s.items !== _linesCacheItems) {
    _linesCacheItems = s.items;
    _linesCacheArr = Object.values(s.items);
  }
  return _linesCacheArr;
};
export const useCartLinesArray = (): CartLine[] =>
  useCartProjectionStore(linesArraySelector);

export { useShallow, useEffect, useMemo };
