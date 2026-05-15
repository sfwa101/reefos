/**
 * CartGateway — Sovereign Cart boundary (Wave P-3 Sub-Wave 1).
 *
 * Constitutional contract (CONSTITUTION_AI_GOVERNANCE §4 + SUPABASE_SOVEREIGNTY §2/§3):
 *   • Only place permitted to read/write `cart_items`, `shared_carts`,
 *     `shared_cart_participants`, `shared_cart_items` realtime, and the
 *     `profiles.loyalty_tier` cart-pricing tier projection from UI-bound
 *     code paths in the cart family.
 *   • Realtime subscriptions for cart-domain tables are vended here.
 *   • Returns typed DTOs / unsubscribe handles; callers never touch the
 *     Supabase client directly.
 *
 * Anomaly flag: `fetchLoyaltyTier` reads `profiles.loyalty_tier`. This is
 * cross-domain (identity) but currently lives in `CartRuntime` to drive
 * pricing. Tracked for relocation to IdentityGateway in a future sub-wave;
 * carried over verbatim here to honor the no-logic-rewrite constraint.
 */
import { supabase } from "@/integrations/supabase/client";

/* ────────────────────────────────────────────────────────────────────────── *
 *  cart_items — per-user persisted cart                                     *
 * ────────────────────────────────────────────────────────────────────────── */

export type CartItemRow = {
  id?: string;
  product_id: string;
  qty: number;
  meta: unknown;
  line_key?: string;
};

export type CartItemUpsertRow = {
  user_id: string;
  product_id: string;
  line_key: string;
  qty: number;
  meta: unknown;
};

export type CartItemKeyRow = {
  id: string;
  product_id: string;
  line_key: string | null;
};

export type GatewayChannel = { unsubscribe: () => void };

const fetchUserCart = async (userId: string): Promise<CartItemRow[]> => {
  const { data, error } = await supabase
    .from("cart_items")
    .select("product_id, qty, meta, line_key")
    .eq("user_id", userId);
  if (error || !Array.isArray(data)) return [];
  return data as CartItemRow[];
};

const clearUserCart = async (
  userId: string,
): Promise<{ error: string | null }> => {
  const del = await supabase.from("cart_items").delete().eq("user_id", userId);
  return { error: del.error?.message ?? null };
};

const upsertCartRows = async (
  rows: CartItemUpsertRow[],
): Promise<{ error: string | null }> => {
  const up = await supabase
    .from("cart_items")
    .upsert(rows as never, { onConflict: "user_id,product_id,line_key" });
  return { error: up.error?.message ?? null };
};

const listCartKeys = async (userId: string): Promise<CartItemKeyRow[]> => {
  const { data } = await supabase
    .from("cart_items")
    .select("id, product_id, line_key")
    .eq("user_id", userId);
  return Array.isArray(data) ? (data as CartItemKeyRow[]) : [];
};

const deleteCartRowsByIds = async (ids: string[]): Promise<void> => {
  if (ids.length === 0) return;
  await supabase.from("cart_items").delete().in("id", ids);
};

/* ────────────────────────────────────────────────────────────────────────── *
 *  Cross-domain leaks (loyalty tier + auth listener) MOVED to               *
 *  IdentityGateway in Wave P-3 Sub-Wave 2. Consume them from                *
 *  `@/core/identity/gateway/IdentityGateway` instead.                       *
 * ────────────────────────────────────────────────────────────────────────── */

/* ────────────────────────────────────────────────────────────────────────── *
 *  Realtime — per-user cart_items                                           *
 * ────────────────────────────────────────────────────────────────────────── */

const subscribeUserCart = (
  userId: string,
  onChange: () => void,
): GatewayChannel => {
  const channel = supabase
    .channel(`cart:${userId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "cart_items",
        filter: `user_id=eq.${userId}`,
      },
      () => onChange(),
    )
    .subscribe();
  return {
    unsubscribe: () => {
      void supabase.removeChannel(channel);
    },
  };
};

/* ────────────────────────────────────────────────────────────────────────── *
 *  Realtime — shared cart (cart, participants, items)                       *
 * ────────────────────────────────────────────────────────────────────────── */

export type SharedCartRealtimePayload = {
  eventType: "INSERT" | "UPDATE" | "DELETE";
  new: unknown;
  old: unknown;
};

export type SharedCartHandlers = {
  onCart: (p: SharedCartRealtimePayload) => void;
  onParticipants: (p: SharedCartRealtimePayload) => void;
  onItems: (p: SharedCartRealtimePayload) => void;
};

const subscribeSharedCart = (
  cartId: string,
  handlers: SharedCartHandlers,
): GatewayChannel => {
  const channel = supabase
    .channel(`shared-cart-${cartId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "shared_carts", filter: `id=eq.${cartId}` },
      (payload) => handlers.onCart(payload as SharedCartRealtimePayload),
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "shared_cart_participants", filter: `cart_id=eq.${cartId}` },
      (payload) => handlers.onParticipants(payload as SharedCartRealtimePayload),
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "shared_cart_items", filter: `cart_id=eq.${cartId}` },
      (payload) => handlers.onItems(payload as SharedCartRealtimePayload),
    )
    .subscribe();
  return {
    unsubscribe: () => {
      void supabase.removeChannel(channel);
    },
  };
};

/* ────────────────────────────────────────────────────────────────────────── *
 *  Wave P-3 Sub-Wave 11 — Cart UI residuals                                 *
 * ────────────────────────────────────────────────────────────────────────── */

const fetchFrequentlyBoughtProductIds = async (
  productIds: string[],
  limit = 6,
): Promise<string[]> => {
  // `frequently_bought_together` RPC is not in the generated Functions
  // map; cast to a typed callable that returns `unknown` (no `any`).
  const rpc = supabase.rpc as unknown as (
    name: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
  const { data } = await rpc("frequently_bought_together", {
    _product_ids: productIds,
    _limit: limit,
  });
  if (!Array.isArray(data)) return [];
  return (data as Array<{ product_id: string }>).map((r) => r.product_id);
};

const fetchFinanceMinOrderTotal = async (): Promise<number> => {
  
  const { data } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "finance")
    .maybeSingle();
  const raw = (data?.value as { min_order_total?: number | string } | null)
    ?.min_order_total;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

const validateCoupon = async (
  code: string,
  orderTotal: number,
): Promise<{ discount: number; error: string | null }> => {
  
  const { data, error } = await supabase.rpc("validate_coupon", {
    _code: code,
    _order_total: orderTotal,
  });
  if (error) return { discount: 0, error: error.message };
  const payload = (data ?? {}) as { discount?: number };
  return { discount: Number(payload.discount ?? 0), error: null };
};

export const CartGateway = {
  fetchUserCart,
  clearUserCart,
  upsertCartRows,
  listCartKeys,
  deleteCartRowsByIds,
  subscribeUserCart,
  subscribeSharedCart,
  fetchFrequentlyBoughtProductIds,
  fetchFinanceMinOrderTotal,
  validateCoupon,
};
