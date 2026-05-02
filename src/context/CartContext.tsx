import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type { Product } from "@/lib/products";
import { trackBuyAgain } from "@/lib/buyAgain";
import { logBehavior } from "@/lib/behavior";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchRemoteCart,
  pushRemoteCart,
  mergeCarts,
  type LocalLine,
} from "@/lib/cartSync";

/**
 * Optional per-line meta. Used by the sweets section to attach a chosen
 * pickup date/time slot on Type C (pre-order) bookings, but generic enough
 * that other sections can extend it (e.g. kitchen scheduled meals).
 */
export type CartLineMeta = {
  bookingDate?: string;
  bookingSlot?: string;
  bookingNote?: string;
  variantId?: string;
  addonIds?: string[];
  unitPrice?: number;
  payDeposit?: boolean;
  shipMode?: "split" | "wait";
  /** Line kind: regular purchase, library borrow, or print job. */
  kind?: "buy" | "borrow" | "print";
  /** Borrow metadata */
  borrowDuration?: "3d" | "7d" | "14d";
  borrowDays?: number;
  borrowDeposit?: number;
  /** Print metadata */
  printConfig?: {
    pages: number;
    copies: number;
    colorMode: "bw" | "color";
    sided: "single" | "double";
    binding: "none" | "spiral" | "plastic" | "thermal";
    fileName?: string;
    filePath?: string;
  };
  /** Estimated prep time (hours) — used for print jobs */
  prepHours?: number;
};

type CartLine = { product: Product; qty: number; meta?: CartLineMeta };

type CartActions = {
  add: (p: Product, qty?: number, meta?: CartLineMeta) => void;
  remove: (id: string) => void;
  setQty: (id: string, qty: number) => void;
  updateMeta: (id: string, meta: CartLineMeta) => void;
  clear: () => void;
};

type CartCtxValue = {
  /** Subscribe to the whole lines array. Triggers on any cart change. */
  subscribe: (cb: () => void) => () => void;
  getSnapshot: () => CartLine[];
  /** Stable ref of actions. */
  actions: CartActions;
};

const Ctx = createContext<CartCtxValue | null>(null);
const STORAGE_KEY = "reef-cart-v1";

// localStorage is blocked in some sandboxed iframes (e.g. Lovable preview
// inside cross-origin contexts). Wrap every access and fall back to an
// in-memory map so the cart still works even when persistence is denied.
const memoryStore: Record<string, string> = {};
const safeStorage = {
  get: (key: string): string | null => {
    try {
      const v = localStorage.getItem(key);
      return v ?? memoryStore[key] ?? null;
    } catch {
      return memoryStore[key] ?? null;
    }
  },
  set: (key: string, value: string): void => {
    memoryStore[key] = value;
    try { localStorage.setItem(key, value); } catch { /* ignore */ }
  },
  remove: (key: string): void => {
    delete memoryStore[key];
    try { localStorage.removeItem(key); } catch { /* ignore */ }
  },
};

/** Stable identity key for a cart line (product + variant + booking + kind). */
const lineKey = (l: { product: { id: string }; meta?: CartLineMeta }): string => {
  const m = l.meta ?? {};
  return [
    l.product.id,
    m.kind ?? "buy",
    m.variantId ?? "",
    m.bookingDate ?? "",
    m.bookingSlot ?? "",
    m.borrowDuration ?? "",
    (m.addonIds ?? []).slice().sort().join(","),
    m.printConfig
      ? `${m.printConfig.pages}-${m.printConfig.copies}-${m.printConfig.colorMode}-${m.printConfig.sided}-${m.printConfig.binding}-${m.printConfig.fileName ?? ""}`
      : "",
  ].join("|");
};

/** Collapse duplicate lines (same key) by summing qty. */
function dedupeLines<T extends { product: { id: string }; qty: number; meta?: CartLineMeta }>(
  lines: T[],
): T[] {
  const map = new Map<string, T>();
  for (const l of lines) {
    const k = lineKey(l);
    const existing = map.get(k);
    if (existing) {
      map.set(k, { ...existing, qty: existing.qty + l.qty });
    } else {
      map.set(k, l);
    }
  }
  return Array.from(map.values());
}

export const CartProvider = ({ children }: { children: ReactNode }) => {
  // Store lines in a ref so updates do not trigger provider re-renders.
  // Components subscribe via useSyncExternalStore with a selector, so each
  // component only re-renders when its slice of state actually changes.
  const linesRef = useRef<CartLine[]>([]);
  const listenersRef = useRef<Set<() => void>>(new Set());

  const emit = useCallback(() => {
    listenersRef.current.forEach((l) => l());
  }, []);

  // Track auth + remote-sync state
  const userIdRef = useRef<string | null | undefined>(undefined);
  const skipNextPushRef = useRef(false);
  const pushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const schedulePush = useCallback(() => {
    if (skipNextPushRef.current) {
      skipNextPushRef.current = false;
      return;
    }
    const uid = userIdRef.current;
    if (!uid) return; // guest → localStorage only
    if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
    pushTimerRef.current = setTimeout(() => {
      const snapshot = linesRef.current.slice();
      void pushRemoteCart(uid, snapshot);
    }, 600);
  }, []);

  const setLines = useCallback(
    (updater: (prev: CartLine[]) => CartLine[]) => {
      linesRef.current = updater(linesRef.current);
      emit();
      safeStorage.set(STORAGE_KEY, JSON.stringify(linesRef.current));
      schedulePush();
    },
    [emit, schedulePush],
  );

  // Hydrate from storage on mount (client-only — SSR-safe)
  useEffect(() => {
    try {
      const raw = safeStorage.get(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        linesRef.current = parsed.filter(
          (l) => l && l.product && typeof l.qty === "number",
        );
        emit();
      }
    } catch {
      /* ignore */
    }
  }, [emit]);

  // Auth-driven remote sync.
  // CRITICAL: On page refresh (initial session restore) the localStorage cart
  // and the remote cart represent the SAME state. Merging them would SUM
  // quantities and duplicate items on every refresh. So:
  //   - Initial restore (prevUid === undefined): REPLACE local with remote.
  //   - Real login (prevUid === null → uid): merge guest cart into remote.
  useEffect(() => {
    let cancelled = false;

    const handleUser = async (uid: string | null) => {
      if (cancelled) return;
      const prevUid = userIdRef.current;
      userIdRef.current = uid;

      if (!uid) return; // guest stays on localStorage

      try {
        const remote = await fetchRemoteCart(uid);
        const guest: LocalLine[] = linesRef.current.slice();
        const isInitialRestore = prevUid === undefined;
        const isFreshLogin = prevUid === null;

        let next: LocalLine[];
        let shouldPush = false;

        if (isInitialRestore) {
          // Page refresh / app boot: trust remote as source of truth.
          // Dedupe defensively in case of legacy duplicated rows.
          next = dedupeLines(remote);
          shouldPush = next.length !== remote.length; // only if we cleaned dups
        } else if (isFreshLogin && guest.length > 0) {
          // Anonymous → logged-in with items in guest cart: merge.
          next = dedupeLines(mergeCarts(guest, remote));
          shouldPush = true;
        } else {
          // User switched accounts or logged in with empty guest cart.
          next = dedupeLines(remote);
          shouldPush = false;
        }

        // Apply locally without re-triggering a push.
        skipNextPushRef.current = true;
        linesRef.current = next;
        emit();
        safeStorage.set(STORAGE_KEY, JSON.stringify(next));

        if (shouldPush) {
          await pushRemoteCart(uid, next);
        }
      } catch (err) {
        console.warn("[cart] sync on login failed:", err);
      }
    };

    void supabase.auth.getUser().then(({ data }) => {
      void handleUser(data.user?.id ?? null);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      void handleUser(session?.user?.id ?? null);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
      if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
    };
  }, [emit]);

  const actions = useMemo<CartActions>(
    () => ({
      add: (p, qty = 1, meta) => {
        trackBuyAgain(p.id);
        void logBehavior({ event: "add_to_cart", productId: p.id, category: (p as any).category });
        setLines((prev) => {
          const i = prev.findIndex((l) => l.product.id === p.id);
          if (i >= 0) {
            const next = prev.slice();
            next[i] = {
              ...next[i],
              qty: next[i].qty + qty,
              meta: meta ? { ...next[i].meta, ...meta } : next[i].meta,
            };
            return next;
          }
          return [...prev, { product: p, qty, meta }];
        });
      },
      remove: (id) =>
        setLines((prev) => prev.filter((l) => l.product.id !== id)),
      setQty: (id, qty) =>
        setLines((prev) =>
          prev
            .map((l) => (l.product.id === id ? { ...l, qty } : l))
            .filter((l) => l.qty > 0),
        ),
      updateMeta: (id, meta) =>
        setLines((prev) =>
          prev.map((l) =>
            l.product.id === id ? { ...l, meta: { ...l.meta, ...meta } } : l,
          ),
        ),
      clear: () => setLines(() => []),
    }),
    [setLines],
  );

  const value = useMemo<CartCtxValue>(
    () => ({
      subscribe: (cb) => {
        listenersRef.current.add(cb);
        return () => {
          listenersRef.current.delete(cb);
        };
      },
      getSnapshot: () => linesRef.current,
      actions,
    }),
    [actions],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

const useCtx = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error("Cart hooks must be used within CartProvider");
  return v;
};

const EMPTY_LINES: CartLine[] = [];
const serverSnapshot = () => EMPTY_LINES;

/**
 * Subscribe to a derived slice of cart state.
 * The component only re-renders when the selected value actually changes
 * (Object.is comparison).
 */
function useCartSelector<T>(selector: (lines: CartLine[]) => T): T {
  const { subscribe, getSnapshot } = useCtx();
  // Cache the last selection so identical objects (e.g. find() returning
  // the same line ref) don't cause spurious updates between snapshots.
  const lastRef = useRef<{ lines: CartLine[]; value: T } | null>(null);
  const getSelected = () => {
    const lines = getSnapshot();
    if (lastRef.current && lastRef.current.lines === lines) {
      return lastRef.current.value;
    }
    const value = selector(lines);
    if (lastRef.current && Object.is(lastRef.current.value, value)) {
      // Keep stable reference so React bails out
      lastRef.current = { lines, value: lastRef.current.value };
      return lastRef.current.value;
    }
    lastRef.current = { lines, value };
    return value;
  };
  return useSyncExternalStore(subscribe, getSelected, serverSnapshot as () => T);
}

/** Full lines array. Use sparingly — re-renders on every cart change. */
export const useCartLines = () => useCartSelector((lines) => lines);

export const useCartCount = () =>
  useCartSelector((lines) => lines.reduce((s, l) => s + l.qty, 0));

export const useCartTotal = () =>
  useCartSelector((lines) =>
    lines.reduce(
      (s, l) => s + l.qty * (l.meta?.unitPrice ?? l.product.price),
      0,
    ),
  );

/** Per-product qty selector — ideal for ProductCard. */
export const useCartLineQty = (productId: string) =>
  useCartSelector(
    (lines) => lines.find((l) => l.product.id === productId)?.qty ?? 0,
  );

/** Stable cart actions. Never causes a re-render. */
export const useCartActions = (): CartActions => useCtx().actions;

/**
 * Backwards-compat hook: returns the same shape as the original useCart().
 * Components that read `lines`, `count`, `total` will re-render on cart changes
 * (same as before). Prefer the granular selectors above for hot paths.
 */
export const useCart = () => {
  const lines = useCartLines();
  const count = useCartCount();
  const total = useCartTotal();
  const actions = useCartActions();
  return { lines, count, total, ...actions };
};
