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
import type { Product } from "@/lib/products";
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

export type CartLine = {
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

export const useCartStore = create<CartState & CartActions>()(
  persist(
    (set) => ({
      items: {},
      productIndex: {},

      add: (product, qty = 1, meta) =>
        set((state) => {
          const candidate: CartLine = { product, qty, meta };
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
            const existing = items[k];
            // Use max() to defend against duplicate echoed rows from remote sync.
            items[k] = existing
              ? { ...existing, qty: Math.max(existing.qty, l.qty) }
              : l;
          }
          return { items, productIndex: buildIndex(items) };
        }),
    }),
    {
      name: STORAGE_KEY,
      storage: safeStorage,
      partialize: (s) => ({ items: s.items, productIndex: s.productIndex }),
      onRehydrateStorage: () => (state) => {
        // Rebuild the index defensively in case persisted data is stale.
        if (state) state.productIndex = buildIndex(state.items);
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
 * Returns the items dictionary as a flat array. Re-renders on any change.
 * Use sparingly — prefer the per-line selectors above.
 */
export const useCartLinesArray = (): CartLine[] =>
  useCartStore(useShallow((s) => Object.values(s.items)));
