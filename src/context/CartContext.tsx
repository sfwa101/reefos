import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchRemoteCart,
  pushRemoteCart,
  mergeCarts,
  type LocalLine,
} from "@/lib/cartSync";
import {
  evaluateCartLineItem,
  type CartPricingResult,
} from "@/core/engine/pricing/cartPricingAdapter";
import type { PricingContext } from "@/core/engine/pricing/types";
import {
  useCartStore,
  useCartActions as useCartStoreActions,
  useCartLinesArray,
  useCartLineQty as useCartStoreLineQty,
  useCartTotalItems,
  lineKey,
  type CartLine,
  type CartLineMeta,
  type CartActions,
} from "@/store/useCartStore";
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
  /** Snapshot of current tier (read by selectors). */
  getTier: () => CustomerTier;
  /** Subscribe to tier changes (selectors that depend on tier re-render). */
  subscribeTier: (cb: () => void) => () => void;
};

const Ctx = createContext<CartCtxValue | null>(null);

/* ---------------------------------------------------------------------------
 * Helpers
 * ------------------------------------------------------------------------- */
const linesFromStore = (): CartLine[] =>
  Object.values(useCartStore.getState().items);

const cartSignature = (lines: ReadonlyArray<CartLine>): string =>
  lines
    .map((l) => `${lineKey(l)}#${l.qty}`)
    .sort()
    .join("||");

/* ---------------------------------------------------------------------------
 * Provider
 * ------------------------------------------------------------------------- */
export const CartProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const tierRef = useRef<CustomerTier>("guest");
  const tierListenersRef = useRef<Set<() => void>>(new Set());
  const emitTier = useCallback(() => {
    tierListenersRef.current.forEach((l) => l());
  }, []);

  const userIdRef = useRef<string | null | undefined>(undefined);
  const skipNextPushRef = useRef(false);
  const lastPushedSignatureRef = useRef("");
  const pushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const realtimeChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(
    null,
  );
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

    // Subscribe to *items* slice only; tier/index changes don't trigger push.
    const unsub = useCartStore.subscribe((state, prev) => {
      if (state.items !== prev.items) schedulePush();
    });
    return () => {
      unsub();
      if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
    };
  }, []);

  /* ---- Auth + remote sync + realtime ---- */
  useEffect(() => {
    let cancelled = false;

    const setTier = (next: CustomerTier) => {
      if (next === tierRef.current) return;
      tierRef.current = next;
      emitTier();
    };

    const fetchProfileTier = async (uid: string) => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("loyalty_tier")
          .eq("id", uid)
          .maybeSingle();
        if (error || cancelled) return;
        const raw = (data as { loyalty_tier?: unknown } | null)?.loyalty_tier;
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
      useCartStore.getState().replaceAll(next);
      lastPushedSignatureRef.current = nextSignature;
      skipNextPushRef.current = false;
    };

    const handleUser = async (uid: string | null) => {
      if (cancelled) return;
      const prevUid = userIdRef.current;
      userIdRef.current = uid;

      if (!uid) {
        setTier("guest");
        return;
      }

      setTier("bronze");
      void fetchProfileTier(uid);

      try {
        const remote = await fetchRemoteCart(uid);
        const guest: LocalLine[] = linesFromStore();
        const isInitialRestore = prevUid === undefined;
        const isFreshLogin = prevUid === null;

        let next: CartLine[];
        let shouldPush = false;

        if (isInitialRestore) {
          next = remote;
        } else if (isFreshLogin && guest.length > 0) {
          next = mergeCarts(guest, remote);
          shouldPush = true;
        } else {
          next = remote;
        }

        applyRemote(next);
        if (shouldPush) await pushRemoteCart(uid, linesFromStore());
      } catch (err) {
        console.warn("[cart] sync on login failed:", err);
      }
    };

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
            if (realtimeFetchTimerRef.current) {
              clearTimeout(realtimeFetchTimerRef.current);
            }
            realtimeFetchTimerRef.current = setTimeout(async () => {
              realtimeFetchTimerRef.current = null;
              const currentUid = userIdRef.current;
              if (!currentUid || currentUid !== uid) return;
              try {
                const remote = await fetchRemoteCart(currentUid);
                const nextSignature = cartSignature(remote);
                if (nextSignature === lastPushedSignatureRef.current) return;
                if (nextSignature === cartSignature(linesFromStore())) return;
                skipNextPushRef.current = true;
                useCartStore.getState().replaceAll(remote);
                lastPushedSignatureRef.current = nextSignature;
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
    };
  }, [emitTier]);

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

/* ---------------------------------------------------------------------------
 * Tier subscription helper
 * ------------------------------------------------------------------------- */
const useCtx = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error("Cart hooks must be used within CartProvider");
  return v;
};

import { useSyncExternalStore } from "react";

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
  useCartStoreLineQty(productId);

export const useCartActions = (): CartActions => useCartStoreActions();

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
