import { useCallback, useEffect, useMemo, useRef, useState } from "react";
// Wave P-3 — All Supabase access (including realtime) routed through the
// Sovereign CartGateway. Direct client imports are prohibited from this file.
import {
  hydrateSharedCartFn,
  setSharedCartStatusFn,
  resetSharedCartApprovalsFn,
  setMyApprovalFn,
  insertSharedCartItemFn,
  updateSharedCartItemQtyFn,
  deleteSharedCartItemFn,
} from "@/lib/cart.functions";
import { useAuth } from "@/context/AuthContext";
import { useVisibilitySocket } from "@/hooks/useVisibilitySocket";

/* ============================================================
 * Phase 6 — Real-Time Shared Carts FSM
 * ------------------------------------------------------------
 * STATE 1: 'active'             → contributors can mutate items
 * STATE 2: 'pending_approvals'  → cart locked; each participant must approve
 * STATE 3: 'frozen'             → all approved; ready for checkout
 * Terminal: 'completed' | 'cancelled'
 * Transitions are owner-driven except auto-frozen (DB trigger when
 * every participant approves).
 * ============================================================ */

export type SharedCartStatus =
  | "active"
  | "pending_approvals"
  | "frozen"
  | "completed"
  | "cancelled";

export type SharedCartRole = "owner" | "contributor";
export type SharedCartSplitType = "percentage" | "fixed" | "itemized";
export type SharedCartApproval = "pending" | "approved" | "rejected";

export type SharedCart = {
  id: string;
  owner_id: string;
  status: SharedCartStatus;
  title: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type SharedCartParticipant = {
  id: string;
  cart_id: string;
  user_id: string;
  role: SharedCartRole;
  split_type: SharedCartSplitType;
  split_value: number;
  approval_status: SharedCartApproval;
  approved_at: string | null;
};

export type SharedCartItem = {
  id: string;
  cart_id: string;
  product_id: string;
  product_name: string;
  unit_price: number;
  quantity: number;
  meta: Record<string, unknown>;
  added_by: string;
  created_at: string;
  updated_at: string;
};

type UseSharedCartSyncResult = {
  cart: SharedCart | null;
  participants: SharedCartParticipant[];
  items: SharedCartItem[];
  loading: boolean;
  error: string | null;
  isOwner: boolean;
  myParticipant: SharedCartParticipant | null;
  // FSM transitions
  requestApprovals: () => Promise<void>;
  reopenForEdits: () => Promise<void>;
  approve: () => Promise<void>;
  reject: () => Promise<void>;
  cancelCart: () => Promise<void>;
  markCompleted: () => Promise<void>;
  // Item ops (active state only)
  addItem: (input: Omit<SharedCartItem, "id" | "cart_id" | "added_by" | "created_at" | "updated_at">) => Promise<void>;
  updateItemQty: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
};

const ACTIVE_STATES: SharedCartStatus[] = ["active"];

const metaSignature = (meta: Record<string, unknown> | null | undefined): string => {
  const m = (meta ?? {}) as Record<string, unknown>;
  const printConfig = (m.printConfig ?? null) as Record<string, unknown> | null;
  const addonIds = Array.isArray(m.addonIds) ? [...(m.addonIds as unknown[])].sort().join(",") : "";
  const printKey = printConfig
    ? `${printConfig.pages ?? ""}-${printConfig.copies ?? ""}-${printConfig.colorMode ?? ""}-${printConfig.sided ?? ""}-${printConfig.binding ?? ""}-${printConfig.fileName ?? ""}`
    : "";
  return [
    m.kind ?? "buy",
    m.variantId ?? m.variant_id ?? "",
    m.bookingDate ?? "",
    m.bookingSlot ?? "",
    m.borrowDuration ?? "",
    addonIds,
    printKey,
  ].join("|");
};

const itemIdentity = (item: Pick<SharedCartItem, "product_id" | "meta">): string =>
  `${item.product_id}|${metaSignature(item.meta)}`;

const normalizeItems = (rows: SharedCartItem[]): SharedCartItem[] => {
  const map = new Map<string, SharedCartItem>();
  for (const row of rows) {
    const key = itemIdentity(row);
    const existing = map.get(key);
    map.set(key, existing ? { ...existing, quantity: Math.max(existing.quantity, row.quantity) } : row);
  }
  return Array.from(map.values()).sort((a, b) => a.created_at.localeCompare(b.created_at));
};

const itemsSignature = (rows: SharedCartItem[]): string =>
  normalizeItems(rows)
    .map((i) => `${itemIdentity(i)}#${i.quantity}`)
    .sort()
    .join("||");

export const useSharedCartSync = (sharedCartId: string | null): UseSharedCartSyncResult => {
  const { user } = useAuth();
  const [cart, setCart] = useState<SharedCart | null>(null);
  const [participants, setParticipants] = useState<SharedCartParticipant[]>([]);
  const [items, setItems] = useState<SharedCartItem[]>([]);
  const [loading, setLoading] = useState<boolean>(!!sharedCartId);
  const [error, setError] = useState<string | null>(null);
  const cancelledRef = useRef(false);
  const lastLocalItemsSignatureRef = useRef("");

  const fetchAll = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await hydrateSharedCartFn({ data: { cartId: id } });
      if (cancelledRef.current) return;
      setCart((result.cart as SharedCart | null) ?? null);
      setParticipants((result.participants as SharedCartParticipant[] | null) ?? []);
      const nextItems = normalizeItems((result.items as unknown as SharedCartItem[] | null) ?? []);
      lastLocalItemsSignatureRef.current = itemsSignature(nextItems);
      setItems(nextItems);
    } catch (e) {
      if (!cancelledRef.current) setError(e instanceof Error ? e.message : "shared_cart_load_failed");
    } finally {
      if (!cancelledRef.current) setLoading(false);
    }
  }, []);

  // Initial load + realtime subscription (Phase 44: visibility-aware)
  useEffect(() => {
    cancelledRef.current = false;
    if (!sharedCartId) {
      setCart(null);
      setParticipants([]);
      setItems([]);
      setLoading(false);
      return;
    }
    fetchAll(sharedCartId);
    return () => {
      cancelledRef.current = true;
    };
  }, [sharedCartId, fetchAll]);

  useVisibilitySocket(
    () => {
      if (!sharedCartId) return;
      const channel = CartGateway.subscribeSharedCart(sharedCartId, {
        onCart: (payload) => {
          if (payload.eventType === "DELETE") setCart(null);
          else setCart((payload.new as SharedCart) ?? null);
        },
        onParticipants: (payload) => {
          setParticipants((prev) => {
            if (payload.eventType === "INSERT") return [...prev, payload.new as SharedCartParticipant];
            if (payload.eventType === "UPDATE")
              return prev.map((p) => (p.id === (payload.new as SharedCartParticipant).id ? (payload.new as SharedCartParticipant) : p));
            if (payload.eventType === "DELETE")
              return prev.filter((p) => p.id !== (payload.old as SharedCartParticipant).id);
            return prev;
          });
        },
        onItems: (payload) => {
          setItems((prev) => {
            let next = prev;
            if (payload.eventType === "INSERT") next = [...prev, payload.new as SharedCartItem];
            else if (payload.eventType === "UPDATE")
              next = prev.map((i) => (i.id === (payload.new as SharedCartItem).id ? (payload.new as SharedCartItem) : i));
            else if (payload.eventType === "DELETE")
              next = prev.filter((i) => i.id !== (payload.old as SharedCartItem).id);
            const normalized = normalizeItems(next);
            const signature = itemsSignature(normalized);
            if (signature === lastLocalItemsSignatureRef.current && itemsSignature(prev) === signature) return prev;
            lastLocalItemsSignatureRef.current = signature;
            return normalized;
          });
        },
      });
      return () => {
        channel.unsubscribe();
      };
    },
    () => {
      // Tab returned to foreground — catch up on anything missed while hidden.
      if (sharedCartId) void fetchAll(sharedCartId);
    },
    [sharedCartId, fetchAll],
    !!sharedCartId,
  );

  const isOwner = !!(cart && user && cart.owner_id === user.id);
  const myParticipant = useMemo(
    () => (user ? participants.find((p) => p.user_id === user.id) ?? null : null),
    [participants, user],
  );

  // ============= FSM transitions =============
  const setStatus = useCallback(
    async (next: SharedCartStatus) => {
      if (!cart) return;
      await setSharedCartStatusFn({ data: { cartId: cart.id, status: next } });
    },
    [cart],
  );

  const requestApprovals = useCallback(async () => {
    if (!cart || !isOwner) throw new Error("forbidden");
    if (cart.status !== "active") throw new Error("invalid_transition");
    // Reset all non-owner participants to pending
    await resetSharedCartApprovalsFn({ data: { cartId: cart.id } });
    await setStatus("pending_approvals");
  }, [cart, isOwner, setStatus]);

  const reopenForEdits = useCallback(async () => {
    if (!cart || !isOwner) throw new Error("forbidden");
    if (!["pending_approvals", "frozen"].includes(cart.status)) throw new Error("invalid_transition");
    await setStatus("active");
  }, [cart, isOwner, setStatus]);

  const approve = useCallback(async () => {
    if (!cart || !myParticipant) throw new Error("forbidden");
    if (cart.status !== "pending_approvals") throw new Error("invalid_state");
    await setMyApprovalFn({ data: { participantId: myParticipant.id, status: "approved" } });
  }, [cart, myParticipant]);

  const reject = useCallback(async () => {
    if (!cart || !myParticipant) throw new Error("forbidden");
    if (cart.status !== "pending_approvals") throw new Error("invalid_state");
    await setMyApprovalFn({ data: { participantId: myParticipant.id, status: "rejected" } });
  }, [cart, myParticipant]);

  const cancelCart = useCallback(async () => {
    if (!cart || !isOwner) throw new Error("forbidden");
    await setStatus("cancelled");
  }, [cart, isOwner, setStatus]);

  const markCompleted = useCallback(async () => {
    if (!cart || !isOwner) throw new Error("forbidden");
    if (cart.status !== "frozen") throw new Error("invalid_transition");
    await setStatus("completed");
  }, [cart, isOwner, setStatus]);

  // ============= Item operations (active state only) =============
  const guardEditable = useCallback(() => {
    if (!cart) throw new Error("no_cart");
    if (!ACTIVE_STATES.includes(cart.status)) throw new Error("cart_locked");
  }, [cart]);

  const addItem: UseSharedCartSyncResult["addItem"] = useCallback(
    async (input) => {
      guardEditable();
      if (!cart || !user) return;
      // Phase 39 — Optimistic UI: snapshot, apply, rollback on error.
      const snapshot = items;
      const optimistic: SharedCartItem = {
        id: `optimistic-${input.product_id}-${metaSignature(input.meta)}-${Date.now()}`,
        cart_id: cart.id,
        added_by: user.id,
        product_id: input.product_id,
        product_name: input.product_name,
        unit_price: input.unit_price,
        quantity: input.quantity,
        meta: input.meta ?? {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const nextItems = normalizeItems([...items, optimistic]);
      lastLocalItemsSignatureRef.current = itemsSignature(nextItems);
      setItems(nextItems);
      try {
        await insertSharedCartItemFn({
          data: {
            cartId: cart.id,
            product_id: input.product_id,
            product_name: input.product_name,
            unit_price: input.unit_price,
            quantity: input.quantity,
            meta: (input.meta ?? {}) as Record<string, unknown>,
          },
        });
      } catch (err) {
        // Rollback to pre-mutation snapshot, then resync from server.
        setItems(snapshot);
        lastLocalItemsSignatureRef.current = itemsSignature(snapshot);
        void fetchAll(cart.id);
        throw err;
      }
    },
    [cart, user, items, guardEditable, fetchAll],
  );

  const updateItemQty = useCallback(
    async (itemId: string, quantity: number) => {
      guardEditable();
      if (!cart) return;
      const snapshot = items;
      const nextItems =
        quantity <= 0
          ? items.filter((i) => i.id !== itemId)
          : items.map((i) => (i.id === itemId ? { ...i, quantity } : i));
      lastLocalItemsSignatureRef.current = itemsSignature(nextItems);
      setItems(nextItems);
      try {
        if (quantity <= 0) {
          await deleteSharedCartItemFn({ data: { itemId } });
          return;
        }
        await updateSharedCartItemQtyFn({ data: { itemId, quantity } });
      } catch (err) {
        setItems(snapshot);
        lastLocalItemsSignatureRef.current = itemsSignature(snapshot);
        void fetchAll(cart.id);
        throw err;
      }
    },
    [items, guardEditable, cart, fetchAll],
  );

  const removeItem = useCallback(
    async (itemId: string) => {
      guardEditable();
      if (!cart) return;
      const snapshot = items;
      const nextItems = items.filter((i) => i.id !== itemId);
      lastLocalItemsSignatureRef.current = itemsSignature(nextItems);
      setItems(nextItems);
      try {
        await deleteSharedCartItemFn({ data: { itemId } });
      } catch (err) {
        setItems(snapshot);
        lastLocalItemsSignatureRef.current = itemsSignature(snapshot);
        void fetchAll(cart.id);
        throw err;
      }
    },
    [items, guardEditable, cart, fetchAll],
  );

  return {
    cart,
    participants,
    items,
    loading,
    error,
    isOwner,
    myParticipant,
    requestApprovals,
    reopenForEdits,
    approve,
    reject,
    cancelCart,
    markCompleted,
    addItem,
    updateItemQty,
    removeItem,
  };
};

/** Compute each participant's owed amount given the cart subtotal. */
export const computeParticipantShares = (
  participants: SharedCartParticipant[],
  subtotal: number,
): Record<string, number> => {
  const shares: Record<string, number> = {};
  for (const p of participants) {
    if (p.split_type === "percentage") {
      shares[p.user_id] = Math.round((subtotal * Number(p.split_value || 0)) / 100);
    } else if (p.split_type === "fixed") {
      shares[p.user_id] = Number(p.split_value || 0);
    } else {
      // itemized handled by caller using items.added_by aggregation
      shares[p.user_id] = 0;
    }
  }
  return shares;
};
