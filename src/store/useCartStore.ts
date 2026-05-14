// ============================================================================
// Zustand cart store — Phase 22.2
// ----------------------------------------------------------------------------
// Atomic store for cart state. Replaces the ref + useSyncExternalStore
// plumbing previously embedded in CartContext.
//
// Design notes:
//   • `items` is a Record<string, CartLine> keyed by `lineKey` (NOT productId
//     alone) so variant / booking / print-config lines remain distinct.
//     This preserves the existing business identity rule from cartSync.ts.
//   • A productId → lineKey index (`productIndex`) gives O(1) per-product
//     selectors (useCartLineQty(productId)) without scanning the dictionary.
//   • All mutation actions are pure object spreads → React will only notify
//     selectors whose returned slice actually changed.
//   • The store is `persist`-wrapped so the cart survives reloads even before
//     the auth-driven remote sync hydrates.
// ============================================================================

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { useShallow } from "zustand/react/shallow";
/**
 * @deprecated Wave P-B (Static Catalog Killer) — `Product` is the legacy
 * denormalized shape. The store keeps it ONLY to populate the transitional
 * `product: Product` bridge field on `CartLine` for the 8 §2.E external
 * consumers that still read `l.product.*`. Migrated leaves consume
 * `ProductCardVM` via `useCartHydration` instead.
 */
import type { Product } from "@/core/catalog/legacyProduct.types";
import type { Modifier } from "@/lib/pricingEngine";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

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

/**
 * Wave P-B (Static Catalog Killer) — `CartLine` shape.
 *
 * Canonical: identity + intent + display snapshot
 *   (`productId`, `variantId?`, `qty`, `capturedPrice`, `capturedName`,
 *   `capturedImage?`, `capturedAt?`).
 *
 * Transitional: `product: Product` is retained as a DEPRECATED bridge so
 * existing cart UI compiles unchanged through Step B-3, where the leaves
 * migrate to `useCartHydration`. New canonical fields are populated by
 * `add()` and by `migrateLegacyCartShape()` for persisted carts.
 */
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
  /** productId → lineKey lookup index (rebuilt on every mutation). */
  productIndex: Record<string, string>;
};

// ---------------------------------------------------------------------------
// Stable line identity (mirrors cartSync.ts)
// ---------------------------------------------------------------------------

export const lineKey = (l: {
  product: { id: string };
  meta?: CartLineMeta;
}): string => {
  const m = (l.meta ?? {}) as CartLineMeta & { variant_id?: string };
  return [
    l.product.id,
    m.kind ?? "buy",
    m.variantId ?? m.variant_id ?? "",
    m.bookingDate ?? "",
    m.bookingSlot ?? "",
    m.borrowDuration ?? "",
    (m.addonIds ?? []).slice().sort().join(","),
    m.printConfig
      ? `${m.printConfig.pages}-${m.printConfig.copies}-${m.printConfig.colorMode}-${m.printConfig.sided}-${m.printConfig.binding}-${m.printConfig.fileName ?? ""}`
      : "",
  ].join("|");
};

const buildIndex = (items: Record<string, CartLine>): Record<string, string> => {
  const idx: Record<string, string> = {};
  for (const [key, line] of Object.entries(items)) {
    // First key wins for a given productId (matches existing find() semantics).
    if (!(line.product.id in idx)) idx[line.product.id] = key;
  }
  return idx;
};

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

const STORAGE_KEY = "reef-cart-v2";

const FALLBACK_CART_IMG =
  "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23f3f4f6'/%3E%3C/svg%3E";

// localStorage may be blocked in sandboxed iframes (Lovable preview).
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
// Wave P-B (Static Catalog Killer)
// ---------------------------------------------------------------------------
// Capture a thin display snapshot at add-to-cart time, plus the canonical
// identity (productId, variantId). Snapshot fields make the cart usable
// offline and during hydration; live VMs come from `useCartHydration`.
// ---------------------------------------------------------------------------

const captureSnapshot = (
  product: Product,
  meta: CartLineMeta | undefined,
): Pick<
  CartLine,
  | "productId"
  | "variantId"
  | "capturedPrice"
  | "capturedName"
  | "capturedImage"
  | "capturedAt"
> => ({
  productId: product.id,
  variantId: meta?.variantId ?? (meta as { variant_id?: string } | undefined)?.variant_id,
  capturedPrice: meta?.unitPrice ?? product.price,
  capturedName: product.name,
  capturedImage: product.image,
  capturedAt: new Date().toISOString(),
});

/**
 * Wave P-B (Static Catalog Killer) — one-shot persisted-cart migration.
 *
 * Lifts pre-P-B persisted lines (`{ product, qty, meta }`) into the new
 * canonical shape (`{ productId, variantId, capturedPrice, capturedName,
 * capturedImage, capturedAt, product (deprecated bridge), qty, meta }`).
 *
 * - Idempotent: lines already in the new shape are left untouched.
 * - Non-throwing: a malformed line is dropped, never crashes rehydration.
 * - The `product` bridge is preserved during the B-3 transition; a follow-up
 *   migration removes it once every UI leaf reads via `useCartHydration`.
 */
export const migrateLegacyCartShape = (
  items: Record<string, CartLine>,
): Record<string, CartLine> => {
  const out: Record<string, CartLine> = {};
  for (const [k, raw] of Object.entries(items)) {
    if (!raw || typeof raw !== "object") continue;
    const line = raw as CartLine;
    if (!line.product || typeof line.product.id !== "string") continue;
    if (line.productId && typeof line.capturedPrice === "number") {
      out[k] = line; // already migrated
      continue;
    }
    const snap = captureSnapshot(line.product, line.meta);
    out[k] = { ...line, ...snap };
  }
  return out;
};

export const useCartStore = create<CartState & CartActions>()(
  persist(
    (set) => ({
      items: {},
      productIndex: {},

      add: (product, qty = 1, meta) =>
        set((state) => {
          const candidate: CartLine = {
            product,
            qty,
            meta,
            ...captureSnapshot(product, meta),
          };
          const key = lineKey(candidate);
          const existing = state.items[key];
          const nextLine: CartLine = existing
            ? {
                ...existing,
                qty: existing.qty + qty,
                meta: meta ? { ...existing.meta, ...meta } : existing.meta,
              }
            : candidate;
          const items = { ...state.items, [key]: nextLine };
          return { items, productIndex: buildIndex(items) };
        }),

      remove: (productId) =>
        set((state) => {
          const items: Record<string, CartLine> = {};
          for (const [k, l] of Object.entries(state.items)) {
            if (l.product.id !== productId) items[k] = l;
          }
          return { items, productIndex: buildIndex(items) };
        }),

      setQty: (productId, qty) =>
        set((state) => {
          const items: Record<string, CartLine> = {};
          for (const [k, l] of Object.entries(state.items)) {
            if (l.product.id === productId) {
              if (qty > 0) items[k] = { ...l, qty };
              // qty <= 0 → drop line
            } else {
              items[k] = l;
            }
          }
          return { items, productIndex: buildIndex(items) };
        }),

      updateMeta: (productId, meta) =>
        set((state) => {
          const items: Record<string, CartLine> = {};
          for (const [k, l] of Object.entries(state.items)) {
            items[k] =
              l.product.id === productId
                ? { ...l, meta: { ...l.meta, ...meta } }
                : l;
          }
          return { items, productIndex: buildIndex(items) };
        }),

      clear: () => set({ items: {}, productIndex: {} }),

      replaceAll: (lines) =>
        set(() => {
          const items: Record<string, CartLine> = {};
          for (const l of lines) {
            const k = lineKey(l);
            const enriched: CartLine = l.productId && typeof l.capturedPrice === "number"
              ? l
              : { ...l, ...captureSnapshot(l.product, l.meta) };
            const existing = items[k];
            // Use max() to defend against duplicate echoed rows from remote sync.
            items[k] = existing
              ? { ...existing, qty: Math.max(existing.qty, enriched.qty) }
              : enriched;
          }
          return { items, productIndex: buildIndex(items) };
        }),
    }),
    {
      name: STORAGE_KEY,
      storage: safeStorage,
      // Wave P-C (Payload Diet) — persist ONLY identity + thin display snapshot.
      // The deprecated `product` bridge is dropped from disk to keep
      // localStorage in the kilobyte range; it is re-synthesised as a stub
      // on rehydrate so legacy `l.product.*` consumers keep compiling until
      // they migrate to `useCartHydration`.
      partialize: (s) => ({
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
            } as unknown as CartLine,
          ]),
        ),
        productIndex: {},
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        // Wave P-B: lift persisted legacy lines into the canonical shape.
        state.items = migrateLegacyCartShape(state.items);
        // Wave P-C: re-synthesise a thin `product` stub from the captured
        // snapshot for any line that was persisted without the bridge.
        for (const [k, l] of Object.entries(state.items)) {
          if (!l.product || typeof l.product.id !== "string") {
            const id = l.productId;
            if (!id) {
              delete state.items[k];
              continue;
            }
            state.items[k] = {
              ...l,
              product: {
                id,
                name: l.capturedName ?? "",
                price: l.capturedPrice ?? 0,
                image: l.capturedImage ?? FALLBACK_CART_IMG,
                unit: "",
                category: "general",
                source: "supermarket",
              } as Product,
            };
          }
        }
        // Rebuild the index defensively against stale persisted data.
        state.productIndex = buildIndex(state.items);
      },
    },
  ),
);


// ---------------------------------------------------------------------------
// Selector hooks — granular, O(1) where possible
// ---------------------------------------------------------------------------

/** Stable actions reference. Never causes a re-render. */
export const useCartActions = (): CartActions =>
  useCartStore(
    useShallow((s) => ({
      add: s.add,
      remove: s.remove,
      setQty: s.setQty,
      updateMeta: s.updateMeta,
      clear: s.clear,
      replaceAll: s.replaceAll,
    })),
  );

/**
 * O(1): re-renders only when THIS product's qty changes.
 */
export const useCartLineQty = (productId: string): number =>
  useCartStore((s) => {
    const key = s.productIndex[productId];
    return key ? (s.items[key]?.qty ?? 0) : 0;
  });

/** Total item count (sum of qty across all lines). */
export const useCartTotalItems = (): number =>
  useCartStore((s) => {
    let n = 0;
    for (const k in s.items) n += s.items[k].qty;
    return n;
  });

/**
 * Returns the items dictionary as a flat array. Memoized by `items` identity:
 * the array reference is stable until the dictionary changes, so consumers
 * (and downstream useMemo selectors) only recompute on real cart mutations.
 */
let _linesCacheItems: Record<string, CartLine> | null = null;
let _linesCacheArr: CartLine[] = [];
const linesArraySelector = (s: CartState): CartLine[] => {
  if (s.items !== _linesCacheItems) {
    _linesCacheItems = s.items;
    _linesCacheArr = Object.values(s.items);
  }
  return _linesCacheArr;
};
export const useCartLinesArray = (): CartLine[] => useCartStore(linesArraySelector);
