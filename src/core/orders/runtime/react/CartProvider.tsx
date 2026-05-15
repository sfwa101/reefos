/**
 * Salsabil OS — Phase P-1.1.D-β · Sovereign Cart React Provider.
 *
 * The React lifecycle layer of the canonical cart. Owns:
 *   • Tier resolution and subscription (loyalty pricing context).
 *   • Remote sync (push / pull) gated on resolved auth.
 *   • Realtime subscription with visibility-aware pause/resume.
 *   • Pricing-driven selector hooks (totals, deposits, loyalty, profit).
 *
 * The legacy file `src/context/CartRuntime.tsx` is now a 100%-logic-free
 * re-export shim pointing at this module.
 */

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
import { CartGateway, type GatewayChannel } from "@/core/orders/gateway/CartGateway";
import { IdentityGateway } from "@/core/identity/gateway/IdentityGateway";
import {
  fetchRemoteCart,
  pushRemoteCart,
  mergeCarts,
  type LocalLine,
} from "@/lib/cartSync";
import type { CartPricingResult } from "@/core/commerce/pricing/cartPricingAdapter";
import type { PricingContext, PriceBreakdown } from "@/core/commerce/pricing/types";
import {
  evaluateCartLineCanonical,
  sumCanonicalGrandTotals,
  type CanonicalLineBreakdown,
} from "@/core/orders/runtime/lineTotals";
import {
  useCartProjectionStore,
  useCartActions as useProjectionActions,
  useCartLinesArray,
  useCartLineQty as useProjectionLineQty,
  useCartTotalItems,
  lineKey,
  replaceCartLines,
} from "@/core/orders/runtime/projection";
import type {
  CartLine,
  CartLineMeta,
  CartActions,
} from "@/core/orders/runtime/types";
import { useAuth } from "@/context/AuthContext";

export type { CartLineMeta, CartActions };

/* ---------------------------------------------------------------------------
 * Customer tier — Phase 8 loyalty
 * ------------------------------------------------------------------------- */
type CustomerTier = NonNullable<PricingContext["customerTier"]>;
const VALID_TIERS: ReadonlySet<CustomerTier> = new Set([
  "guest",
  "bronze",
  "silver",
  "gold",
  "platinum",
  "vip",
]);
const isCustomerTier = (v: unknown): v is CustomerTier =>
  typeof v === "string" && VALID_TIERS.has(v as CustomerTier);

type CartCtxValue = {
  getTier: () => CustomerTier;
  subscribeTier: (cb: () => void) => () => void;
};

const Ctx = createContext<CartCtxValue | null>(null);

const linesFromStore = (): CartLine[] =>
  Object.values(useCartProjectionStore.getState().items);

const cartSignature = (lines: ReadonlyArray<CartLine>): string =>
  lines
    .map((l) => `${lineKey(l)}#${l.qty}`)
    .sort()
    .join("||");

/* ---------------------------------------------------------------------------
 * Provider
 * ------------------------------------------------------------------------- */
const MERGE_MARKER_PREFIX = "reef-cart-merged:";
const isMerged = (uid: string): boolean => {
  try {
    return sessionStorage.getItem(MERGE_MARKER_PREFIX + uid) === "1";
  } catch {
    return false;
  }
};
const markMerged = (uid: string): void => {
  try {
    sessionStorage.setItem(MERGE_MARKER_PREFIX + uid, "1");
  } catch {
    /* ignore */
  }
};

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const { user, isInitializing } = useAuth();
  const tierRef = useRef<CustomerTier>("guest");
  const tierListenersRef = useRef<Set<() => void>>(new Set());
  const emitTier = useCallback(() => {
    tierListenersRef.current.forEach((l) => l());
  }, []);

  const userIdRef = useRef<string | null>(null);
  const skipNextPushRef = useRef(false);
  const lastPushedSignatureRef = useRef("");
  const pendingMergeForUidRef = useRef<string | null>(null);
  const pushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const realtimeChannelRef = useRef<GatewayChannel | null>(null);
  const realtimeFetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  /* ---- Push (debounced) on every store mutation ---- */
  useEffect(() => {
    const schedulePush = () => {
      if (skipNextPushRef.current) {
        skipNextPushRef.current = false;
        return;
      }
      const uid = userIdRef.current;
      if (!uid) return;
      if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
      pushTimerRef.current = setTimeout(() => {
        const snapshot = linesFromStore();
        const signature = cartSignature(snapshot);
        if (signature === lastPushedSignatureRef.current) return;
        lastPushedSignatureRef.current = signature;
        void pushRemoteCart(uid, snapshot);
      }, 600);
    };

    const unsub = useCartProjectionStore.subscribe((state, prev) => {
      if (state.items !== prev.items) schedulePush();
    });
    return () => {
      unsub();
      if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
    };
  }, []);

  /* ---- Listen to true SIGNED_IN events (manual login transitions only) ---- */
  useEffect(() => {
    const sub = IdentityGateway.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user?.id) {
        pendingMergeForUidRef.current = session.user.id;
      }
      if (event === "SIGNED_OUT") {
        pendingMergeForUidRef.current = null;
      }
    });
    return () => sub.unsubscribe();
  }, []);

  /* ---- Remote sync + realtime — gated on resolved auth ---- */
  const uid = user?.id ?? null;
  useEffect(() => {
    if (isInitializing) return;

    let cancelled = false;

    const setTier = (next: CustomerTier) => {
      if (next === tierRef.current) return;
      tierRef.current = next;
      emitTier();
    };

    const fetchProfileTier = async (id: string) => {
      try {
        const raw = await IdentityGateway.fetchLoyaltyTier(id);
        if (cancelled) return;
        setTier(isCustomerTier(raw) ? raw : "bronze");
      } catch {
        /* keep current tier */
      }
    };

    const applyRemote = (next: CartLine[]) => {
      const nextSignature = cartSignature(next);
      if (nextSignature === cartSignature(linesFromStore())) {
        lastPushedSignatureRef.current = nextSignature;
        return;
      }
      skipNextPushRef.current = true;
      replaceCartLines(next);
      lastPushedSignatureRef.current = nextSignature;
      skipNextPushRef.current = false;
    };

    const teardownRealtime = () => {
      if (realtimeFetchTimerRef.current) {
        clearTimeout(realtimeFetchTimerRef.current);
        realtimeFetchTimerRef.current = null;
      }
      const ch = realtimeChannelRef.current;
      if (ch) {
        ch.unsubscribe();
        realtimeChannelRef.current = null;
      }
    };

    const subscribeRealtime = (id: string) => {
      teardownRealtime();
      const channel = CartGateway.subscribeUserCart(id, () => {
        if (realtimeFetchTimerRef.current) {
          clearTimeout(realtimeFetchTimerRef.current);
        }
        realtimeFetchTimerRef.current = setTimeout(async () => {
          realtimeFetchTimerRef.current = null;
          const currentUid = userIdRef.current;
          if (!currentUid || currentUid !== id) return;
          try {
            const remote = await fetchRemoteCart(currentUid);
            const nextSignature = cartSignature(remote);
            if (nextSignature === lastPushedSignatureRef.current) return;
            if (nextSignature === cartSignature(linesFromStore())) return;
            skipNextPushRef.current = true;
            replaceCartLines(remote);
            lastPushedSignatureRef.current = nextSignature;
            skipNextPushRef.current = false;
          } catch (err) {
            console.warn("[cart] realtime refetch failed:", err);
          }
        }, 250);
      });
      realtimeChannelRef.current = channel;
    };

    const onVisibility = () => {
      if (typeof document === "undefined") return;
      const id = userIdRef.current;
      if (!id) return;
      if (document.visibilityState === "hidden") {
        teardownRealtime();
      } else if (!realtimeChannelRef.current) {
        subscribeRealtime(id);
        void (async () => {
          try {
            const remote = await fetchRemoteCart(id);
            applyRemote(remote);
          } catch (err) {
            console.warn("[cart] visibility resume refetch failed:", err);
          }
        })();
      }
    };
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", onVisibility);
    }

    const handleUser = async () => {
      userIdRef.current = uid;

      if (!uid) {
        setTier("guest");
        teardownRealtime();
        return;
      }

      setTier("bronze");
      void fetchProfileTier(uid);

      try {
        const remote = await fetchRemoteCart(uid);
        if (cancelled) return;

        const merged = isMerged(uid);
        const wantsMerge = pendingMergeForUidRef.current === uid && !merged;

        let next: CartLine[];
        let shouldPush = false;

        if (wantsMerge) {
          const guest: LocalLine[] = linesFromStore();
          next = mergeCarts(guest, remote);
          shouldPush = guest.length > 0;
          markMerged(uid);
          pendingMergeForUidRef.current = null;
        } else {
          next = remote;
          markMerged(uid);
        }

        applyRemote(next);
        lastPushedSignatureRef.current = cartSignature(next);
        if (shouldPush) {
          skipNextPushRef.current = true;
          await pushRemoteCart(uid, next);
        }
      } catch (err) {
        console.warn("[cart] sync on login failed:", err);
      }

      if (!cancelled) subscribeRealtime(uid);
    };

    void handleUser();

    return () => {
      cancelled = true;
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", onVisibility);
      }
      teardownRealtime();
    };
  }, [uid, isInitializing, emitTier]);

  const value = useMemo<CartCtxValue>(
    () => ({
      getTier: () => tierRef.current,
      subscribeTier: (cb) => {
        tierListenersRef.current.add(cb);
        return () => {
          tierListenersRef.current.delete(cb);
        };
      },
    }),
    [],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

const useCtx = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error("Cart hooks must be used within CartProvider");
  return v;
};

const useTier = (): CustomerTier => {
  const { subscribeTier, getTier } = useCtx();
  return useSyncExternalStore(subscribeTier, getTier, () => "guest" as CustomerTier);
};

/* ---------------------------------------------------------------------------
 * Public selector hooks (preserved API)
 * ------------------------------------------------------------------------- */

export const useCartLines = (): CartLine[] => useCartLinesArray();

export const useCartCount = (): number => useCartTotalItems();

export const useCartLineQty = (productId: string): number =>
  useProjectionLineQty(productId);

export const useCartActions = (): CartActions => useProjectionActions();

/* ---- Pricing-driven selectors ---- */

function evaluateLineForCart(
  l: CartLine,
  tier: CustomerTier,
):
  | { result: CartPricingResult; legacyTotal: number }
  | { result: null; legacyTotal: number } {
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

export const useCartLineBreakdown = (
  productId: string,
): CartPricingResult | null => {
  const tier = useTier();
  const lines = useCartLines();
  return useMemo(() => {
    const line = lines.find((l) => l.product.id === productId);
    if (!line) return null;
    return evaluateLineForCart(line, tier).result;
  }, [lines, productId, tier]);
};

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
  const tier = useTier();
  const lines = useCartLines();
  return useMemo(() => {
    if (lines.length === 0) return EMPTY_CHECKOUT_RULES;
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
        blocksCOD = true;
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
  }, [lines, tier]);
};

export const useCartTotal = (): number => {
  const tier = useTier();
  const lines = useCartLines();
  return useMemo(
    () =>
      lines.reduce((sum, l) => {
        const { result, legacyTotal } = evaluateLineForCart(l, tier);
        if (result === null) return sum + legacyTotal;
        if (result.kind === "ok") return sum + result.breakdown.grandTotal;
        if (result.kind === "fallback") return sum + legacyTotal;
        console.warn(
          "[cart] pricing engine error:",
          result.code,
          result.message,
          { productId: l.product.id },
        );
        return sum;
      }, 0),
    [lines, tier],
  );
};

export type CartLineError = {
  readonly productId: string;
  readonly productName: string;
  readonly code: string;
  readonly message: string;
};

export const useCartErrors = (): readonly CartLineError[] => {
  const tier = useTier();
  const lines = useCartLines();
  return useMemo(() => {
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
  }, [lines, tier]);
};

export const useCartHasErrors = (): boolean => useCartErrors().length > 0;

export interface CartLoyaltySummary {
  readonly basePoints: number;
  readonly bonusPoints: number;
  readonly totalPoints: number;
  readonly tier: CustomerTier;
  readonly bonusLines: ReadonlyArray<{
    readonly productId: string;
    readonly productName: string;
    readonly bonusPoints: number;
  }>;
}

const EMPTY_LOYALTY: CartLoyaltySummary = {
  basePoints: 0,
  bonusPoints: 0,
  totalPoints: 0,
  tier: "guest",
  bonusLines: [],
};

export const useCartLoyalty = (): CartLoyaltySummary => {
  const tier = useTier();
  const lines = useCartLines();
  return useMemo(() => {
    if (lines.length === 0 || tier === "guest") {
      return { ...EMPTY_LOYALTY, tier };
    }
    let basePoints = 0;
    let bonusPoints = 0;
    const bonusLines: Array<{
      productId: string;
      productName: string;
      bonusPoints: number;
    }> = [];
    for (const l of lines) {
      const { result } = evaluateLineForCart(l, tier);
      if (!result || result.kind !== "ok") continue;
      const b = result.breakdown;
      basePoints += b.pointsEarned;
      const lb = b.bonusPoints ?? 0;
      if (lb > 0) {
        bonusPoints += lb;
        bonusLines.push({
          productId: l.product.id,
          productName: l.product.name,
          bonusPoints: lb,
        });
      }
    }
    return {
      basePoints,
      bonusPoints,
      totalPoints: basePoints + bonusPoints,
      tier,
      bonusLines,
    };
  }, [lines, tier]);
};

export interface CartProfitSummary {
  readonly totalNetProfit: number;
  readonly totalCostPrice: number;
  readonly requiresAdminApproval: boolean;
  readonly flaggedLines: ReadonlyArray<{
    readonly productId: string;
    readonly productName: string;
    readonly reason: string;
  }>;
  readonly hasKitchenItem: boolean;
}

const EMPTY_PROFIT: CartProfitSummary = {
  totalNetProfit: 0,
  totalCostPrice: 0,
  requiresAdminApproval: false,
  flaggedLines: [],
  hasKitchenItem: false,
};

export const useCartProfit = (): CartProfitSummary => {
  const tier = useTier();
  const lines = useCartLines();
  return useMemo(() => {
    if (lines.length === 0) return EMPTY_PROFIT;
    let totalNetProfit = 0;
    let totalCostPrice = 0;
    let requiresAdminApproval = false;
    let hasKitchenItem = false;
    const flaggedLines: Array<{
      productId: string;
      productName: string;
      reason: string;
    }> = [];
    for (const l of lines) {
      if (l.product.source === "kitchen") hasKitchenItem = true;
      const { result } = evaluateLineForCart(l, tier);
      if (!result || result.kind !== "ok") continue;
      const b = result.breakdown;
      totalNetProfit += b.netProfit;
      totalCostPrice += b.costPrice;
      if (b.requiresAdminApproval) {
        requiresAdminApproval = true;
        flaggedLines.push({
          productId: l.product.id,
          productName: l.product.name,
          reason: b.lossPreventionReason ?? "بانتظار مراجعة الإدارة",
        });
      }
    }
    return {
      totalNetProfit: Math.round(totalNetProfit * 100) / 100,
      totalCostPrice: Math.round(totalCostPrice * 100) / 100,
      requiresAdminApproval,
      flaggedLines,
      hasKitchenItem,
    };
  }, [lines, tier]);
};

/** Backwards-compat aggregate hook. */
export const useCart = () => {
  const lines = useCartLines();
  const count = useCartCount();
  const total = useCartTotal();
  const actions = useCartActions();
  return { lines, count, total, ...actions };
};
