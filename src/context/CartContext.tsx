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
import type { Modifier } from "@/lib/pricingEngine";
import {
  evaluateCartLineItem,
  type CartPricingResult,
} from "@/core/engine/pricing/cartPricingAdapter";
import type { PricingContext } from "@/core/engine/pricing/types";

/**
 * Customer tier source — Phase 2.J.
 * We currently only know "guest" vs "member" from the auth session.
 * VIP promotion is handled later by a profile flag (e.g. loyalty points
 * threshold) and will be wired here once the profiles schema exposes it.
 */
type CustomerTier = NonNullable<PricingContext["customerTier"]>;
const tierFromUserId = (uid: string | null | undefined): CustomerTier =>
  uid ? "member" : "guest";

/**
 * Per-line meta.
 *
 * NEW (Universal Commerce Engine — Phase 3):
 *   - `appliedModifiers`: Modifier[] — the canonical, polymorphic
 *     way every section (meat / sweets / library / pharmacy / …)
 *     should describe what the user added on top of the base price.
 *     Re-pricing the cart only needs basePrice + appliedModifiers.
 *   - `properties`: free-form Record for non-pricing flags (e.g.
 *     bookingNote, fileName, gift wrap message text, etc.).
 *
 * LEGACY (kept for backward compatibility while consumers migrate):
 *   bookingDate / bookingSlot / borrowDuration / printConfig / …
 *   These will be removed once every section emits Modifier[].
 */
export type CartLineMeta = {
  /** Universal modifiers — preferred shape going forward. */
  appliedModifiers?: Modifier[];
  /** Free-form, domain-specific non-pricing data. */
  properties?: Record<string, unknown>;

  /* ---- Legacy fields (do not extend) ---- */
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
  /** Current customer tier (read inside selectors via ref). */
  getTier: () => CustomerTier;
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

/** Collapse duplicate lines (same key). External sync uses max to avoid echo-amplifying corrupted duplicates. */
function dedupeLines<T extends { product: { id: string }; qty: number; meta?: CartLineMeta }>(
  lines: T[],
  mode: "sum" | "max" = "sum",
): T[] {
  const map = new Map<string, T>();
  for (const l of lines) {
    const k = lineKey(l);
    const existing = map.get(k);
    if (existing) {
      map.set(k, {
        ...existing,
        qty: mode === "sum" ? existing.qty + l.qty : Math.max(existing.qty, l.qty),
      });
    } else {
      map.set(k, l);
    }
  }
  return Array.from(map.values());
}

const cartSignature = (lines: LocalLine[]): string =>
  dedupeLines(lines, "max")
    .map((l) => `${lineKey(l)}#${l.qty}`)
    .sort()
    .join("||");

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
  const tierRef = useRef<CustomerTier>("guest");
  const skipNextPushRef = useRef(false);
  const lastPushedSignatureRef = useRef("");
  const pushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Phase 4.4.R — Realtime cross-device sync.
  // Holds the active Supabase channel for the signed-in user; rebound on
  // login / user-switch and torn down on logout. Coalesce bursts of
  // postgres_changes events into a single re-fetch via realtimeFetchTimerRef.
  const realtimeChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(
    null,
  );
  const realtimeFetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

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
      const signature = cartSignature(snapshot);
      if (signature === lastPushedSignatureRef.current) return;
      lastPushedSignatureRef.current = signature;
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
        const valid = parsed.filter(
          (l) => l && l.product && typeof l.qty === "number",
        );
        // Defensive: collapse any duplicate lines that may have been
        // persisted by older buggy versions.
        linesRef.current = dedupeLines(valid, "max");
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
      const nextTier = tierFromUserId(uid);
      if (nextTier !== tierRef.current) {
        tierRef.current = nextTier;
        // Force selectors (totals, error list) to re-evaluate with the new tier.
        emit();
      }

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
          next = dedupeLines(remote, "max");
          shouldPush = next.length !== remote.length; // only if we cleaned dups
        } else if (isFreshLogin && guest.length > 0) {
          // Anonymous → logged-in with items in guest cart: merge.
          next = dedupeLines(mergeCarts(guest, remote));
          shouldPush = true;
        } else {
          // User switched accounts or logged in with empty guest cart.
          next = dedupeLines(remote, "max");
          shouldPush = false;
        }

        // Apply locally without re-triggering a push.
        const nextSignature = cartSignature(next);
        if (nextSignature === cartSignature(linesRef.current)) {
          lastPushedSignatureRef.current = nextSignature;
          if (shouldPush) await pushRemoteCart(uid, next);
          return;
        }
        skipNextPushRef.current = true;
        linesRef.current = next;
        lastPushedSignatureRef.current = nextSignature;
        emit();
        safeStorage.set(STORAGE_KEY, JSON.stringify(next));
        skipNextPushRef.current = false;

        if (shouldPush) {
          await pushRemoteCart(uid, next);
        }
      } catch (err) {
        console.warn("[cart] sync on login failed:", err);
      }
    };

    /**
     * Phase 4.4.R — Realtime cross-device sync.
     * Re-fetches the canonical remote cart whenever ANY mutation lands on
     * the user's rows in `cart_items`. We refetch (not patch) because:
     *   • Push is delete+insert → events arrive bursty; a single SELECT is
     *     simpler and race-free.
     *   • Signature equality with `lastPushedSignatureRef` filters self-echo,
     *     so the originating device never reapplies its own write.
     */
    const teardownRealtime = () => {
      if (realtimeFetchTimerRef.current) {
        clearTimeout(realtimeFetchTimerRef.current);
        realtimeFetchTimerRef.current = null;
      }
      const ch = realtimeChannelRef.current;
      if (ch) {
        void supabase.removeChannel(ch);
        realtimeChannelRef.current = null;
      }
    };

    const subscribeRealtime = (uid: string) => {
      teardownRealtime();
      const channel = supabase
        .channel(`cart:${uid}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "cart_items",
            filter: `user_id=eq.${uid}`,
          },
          () => {
            // Coalesce burst (delete+insert from a single push lands as 1+N events).
            if (realtimeFetchTimerRef.current) {
              clearTimeout(realtimeFetchTimerRef.current);
            }
            realtimeFetchTimerRef.current = setTimeout(async () => {
              realtimeFetchTimerRef.current = null;
              const currentUid = userIdRef.current;
              if (!currentUid || currentUid !== uid) return;
              try {
                const remote = await fetchRemoteCart(currentUid);
                const next = dedupeLines(remote, "max");
                const nextSignature = cartSignature(next);
                // Self-echo guard: ignore broadcasts caused by our own push.
                if (nextSignature === lastPushedSignatureRef.current) return;
                if (nextSignature === cartSignature(linesRef.current)) return;
                // Apply remote authoritatively without re-pushing.
                skipNextPushRef.current = true;
                linesRef.current = next;
                lastPushedSignatureRef.current = nextSignature;
                emit();
                safeStorage.set(STORAGE_KEY, JSON.stringify(next));
                skipNextPushRef.current = false;
              } catch (err) {
                console.warn("[cart] realtime refetch failed:", err);
              }
            }, 250);
          },
        )
        .subscribe();
      realtimeChannelRef.current = channel;
    };

    // Wrap handleUser so realtime follows the auth lifecycle exactly.
    const handleUserWithRealtime = async (uid: string | null) => {
      await handleUser(uid);
      if (cancelled) return;
      if (uid) subscribeRealtime(uid);
      else teardownRealtime();
    };

    void supabase.auth.getUser().then(({ data }) => {
      void handleUserWithRealtime(data.user?.id ?? null);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      void handleUserWithRealtime(session?.user?.id ?? null);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
      teardownRealtime();
      if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
    };
  }, [emit]);

  const actions = useMemo<CartActions>(
    () => ({
      add: (p, qty = 1, meta) => {
        trackBuyAgain(p.id);
        void logBehavior({ event: "add_to_cart", productId: p.id, category: p.category });
        setLines((prev) => {
          // Match on full identity (product + variant + booking + kind).
          const candidate = { product: p, qty, meta };
          const targetKey = lineKey(candidate);
          const i = prev.findIndex((l) => lineKey(l) === targetKey);
          if (i >= 0) {
            const next = prev.slice();
            next[i] = {
              ...next[i],
              qty: next[i].qty + qty,
              meta: meta ? { ...next[i].meta, ...meta } : next[i].meta,
            };
            return next;
          }
          return [...prev, candidate];
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
      getTier: () => tierRef.current,
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

/**
 * Per-line evaluation — single source of truth for both totals and the
 * errors hook (Phase 2.J). Returns `null` for legacy lines that bypass
 * the engine entirely (Fail-Safe Guard).
 */
function evaluateLineForCart(
  l: CartLine,
  tier: CustomerTier,
): { result: CartPricingResult; legacyTotal: number } | { result: null; legacyTotal: number } {
  const legacyTotal = l.qty * (l.meta?.unitPrice ?? l.product.price);
  const props = l.meta?.properties as { selection?: unknown } | undefined;
  const hasNewShape =
    (l.meta?.appliedModifiers && l.meta.appliedModifiers.length > 0) ||
    props?.selection !== undefined;
  if (!hasNewShape) return { result: null, legacyTotal };

  const result = evaluateCartLineItem({
    product: l.product,
    quantity: l.qty,
    selection: ((props?.selection ?? props) ?? {}) as never,
    context: { customerTier: tier },
  });
  return { result, legacyTotal };
}

/* ===================================================================
 * Phase 5.3 — Per-line breakdown selector for UI fidelity.
 * `useCartLineBreakdown(productId)` finds the matching line and runs
 * the same pipeline as totals/errors, so the UI always sees the
 * exact same numbers as the cart total.
 * =================================================================== */
export const useCartLineBreakdown = (
  productId: string,
): CartPricingResult | null => {
  const { getTier } = useCtx();
  return useCartSelector((lines) => {
    const tier = getTier();
    const line = lines.find((l) => l.product.id === productId);
    if (!line) return null;
    return evaluateLineForCart(line, tier).result;
  });
};

/* ===================================================================
 * Phase 6 — Checkout guardrails aggregator.
 * Walks every line through the engine and folds the breakdowns into a
 * single immutable summary the Checkout / PaymentMethods UI uses to:
 *   • disable Cash-on-Delivery when ANY line requires a deposit or
 *     explicitly blocks COD (e.g. high-value bookings, library borrows).
 *   • surface the total upfront deposit to the customer.
 *   • list the offending products so the UX can explain WHY COD is off.
 * =================================================================== */
export interface CartCheckoutRules {
  readonly hasRequiredDeposit: boolean;
  readonly totalDepositAmount: number;
  readonly blocksCOD: boolean;
  readonly depositLines: ReadonlyArray<{
    readonly productId: string;
    readonly productName: string;
    readonly amount: number;
  }>;
}

const EMPTY_CHECKOUT_RULES: CartCheckoutRules = {
  hasRequiredDeposit: false,
  totalDepositAmount: 0,
  blocksCOD: false,
  depositLines: [],
};

export const useCartCheckoutRules = (): CartCheckoutRules => {
  const { getTier } = useCtx();
  return useCartSelector((lines): CartCheckoutRules => {
    if (lines.length === 0) return EMPTY_CHECKOUT_RULES;
    const tier = getTier();
    let hasRequiredDeposit = false;
    let totalDepositAmount = 0;
    let blocksCOD = false;
    const depositLines: Array<{
      productId: string;
      productName: string;
      amount: number;
    }> = [];

    for (const l of lines) {
      const { result } = evaluateLineForCart(l, tier);
      if (!result || result.kind !== "ok") continue;
      const b = result.breakdown;
      if (b.depositRequired && b.depositAmount > 0) {
        hasRequiredDeposit = true;
        blocksCOD = true; // required deposit must be paid upfront → no COD.
        totalDepositAmount += b.depositAmount;
        depositLines.push({
          productId: l.product.id,
          productName: l.product.name,
          amount: b.depositAmount,
        });
      }
    }

    return {
      hasRequiredDeposit,
      totalDepositAmount: Math.round(totalDepositAmount * 100) / 100,
      blocksCOD,
      depositLines,
    };
  });
};

/**
 * Cart grand total — Phase 2.I (Flip the Switch) + 2.J (tier wiring).
 *
 * Per-line decision tree:
 *   1. Fail-Safe Guard: legacy line → use legacy unit-price math.
 *   2. Otherwise call engine with `customerTier` from auth context:
 *        • "ok"           → add `breakdown.grandTotal`
 *        • "fallback"     → add legacy unit-price total
 *        • "engine_error" → skip (surfaced via `useCartErrors` banner)
 */
export const useCartTotal = () => {
  const { getTier } = useCtx();
  return useCartSelector((lines) => {
    const tier = getTier();
    return lines.reduce((sum, l) => {
      const { result, legacyTotal } = evaluateLineForCart(l, tier);
      if (result === null) return sum + legacyTotal;
      if (result.kind === "ok") return sum + result.breakdown.grandTotal;
      if (result.kind === "fallback") return sum + legacyTotal;
      // engine_error: do not silently miscount; banner blocks checkout.
      console.warn(
        "[cart] pricing engine error:",
        result.code,
        result.message,
        { productId: l.product.id },
      );
      return sum;
    }, 0);
  });
};

/* ===================================================================
 * Phase 2.J — useCartErrors
 * Returns the list of cart lines whose pricing failed validation
 * (e.g. Sweets Type C without booking). The Cart page uses this to
 * (a) render a warning banner and (b) block checkout until fixed.
 * =================================================================== */

export type CartLineError = {
  readonly productId: string;
  readonly productName: string;
  readonly code: string;
  readonly message: string;
};

export const useCartErrors = (): readonly CartLineError[] => {
  const { getTier } = useCtx();
  return useCartSelector((lines) => {
    const tier = getTier();
    const out: CartLineError[] = [];
    for (const l of lines) {
      const { result } = evaluateLineForCart(l, tier);
      if (result && result.kind === "engine_error") {
        out.push({
          productId: l.product.id,
          productName: l.product.name,
          code: result.code,
          message: result.message,
        });
      }
    }
    return out;
  });
};

export const useCartHasErrors = (): boolean => useCartErrors().length > 0;

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
