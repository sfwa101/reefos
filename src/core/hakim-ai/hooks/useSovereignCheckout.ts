/**
 * Phase 10 Part 2 — The Sovereign Checkout Hook.
 *
 * Wraps the `process_checkout_sovereign` RPC: takes the customer id,
 * a list of `{ product_id, quantity }` cart lines, and a `delivery_info`
 * jsonb blob, and returns the new master_order_id.
 *
 * Atomic on the server: the RPC creates the master order, resolves each
 * legacy product to a Sovereign SKU, picks the cheapest vendor with
 * stock, decrements the inventory matrix, and fans out fulfillment
 * nodes + items per-tenant. The whole pipeline rolls back on any
 * failure (insufficient stock, unresolved SKU, empty cart).
 */
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { validatedSovereignCheckoutFn } from "@/core/cashier/gateway/checkout.functions";
import { Tracer } from "@/core/system/observability/Tracer";

export type SovereignCartItem = {
  product_id: string;
  quantity: number;
};

export type SovereignDeliveryInfo = {
  address_id?: string | null;
  address_label?: string | null;
  city?: string | null;
  district?: string | null;
  street?: string | null;
  building?: string | null;
  phone?: string | null;
  recipient_name?: string | null;
  zone?: string | null;
  lat?: number | null;
  lng?: number | null;
  notes?: string | null;
  service_type?: string | null;
  // free-form passthrough
  [k: string]: unknown;
};

export type SovereignCheckoutInput = {
  customer_id: string;
  cart_items: SovereignCartItem[];
  delivery_info: SovereignDeliveryInfo;
  /**
   * Phase 36 Titanium Shield — required UUID v4. The server gates against
   * duplicate inserts on this key; safe to retry the same call across
   * network failures without creating duplicate orders or charges.
   */
  idempotency_key: string;
  /**
   * Phase C5 — Sovereign Price Validation (Article 12.1). Deterministic
   * `snapshot_hash` produced by the latest Cashier Brain preview. The
   * server re-runs the brain against authoritative DNA and rejects the
   * checkout if the hash does not match.
   */
  expected_snapshot_hash: string;
  /** Optional context override for the price re-computation (defaults to guest tier). */
  cashier_context?: {
    member_tier?: "guest" | "bronze" | "silver" | "gold" | "vip";
    coupon_code?: string | null;
    delivery_zone_id?: string | null;
    delivery_fee?: number;
    currency?: string;
  };
};

/** Browser-safe UUID v4 generator (crypto.randomUUID with a polyfill fallback). */
export const newIdempotencyKey = (): string => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // RFC4122-ish fallback (very rarely hit on modern targets).
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

const friendly = (msg: string): string => {
  const m = msg.toLowerCase();
  if (m.includes("insufficient stock")) return "أحد المنتجات نفد من المخزون لدى الموردين";
  if (m.includes("cart is empty")) return "السلة فارغة";
  if (m.includes("cannot resolve product")) return "أحد المنتجات لم يعد متوفراً في الكتالوج السيادي";
  if (m.includes("customer_id required")) return "يجب تسجيل الدخول لإتمام الطلب";
  return msg;
};

/**
 * Plain async caller — usable from non-hook contexts (e.g. the cart
 * orchestrator's submit handler) without restructuring the call site.
 */
export const callSovereignCheckout = async (
  input: SovereignCheckoutInput,
): Promise<string> => {
  if (!input.idempotency_key) {
    throw new Error("idempotency_key is required for checkout");
  }
  if (!input.expected_snapshot_hash) {
    throw new Error(
      "عفواً، لم يكتمل احتساب السعر السيادي بعد. يرجى الانتظار لحظة وإعادة المحاولة.",
    );
  }

  let data: string;
  try {
    data = await validatedSovereignCheckoutFn({
      data: {
        customer_id: input.customer_id,
        cart_items: input.cart_items,
        delivery_info: (input.delivery_info ?? {}) as Record<string, unknown>,
        idempotency_key: input.idempotency_key,
        expected_snapshot_hash: input.expected_snapshot_hash,
        cashier_context: input.cashier_context ?? { member_tier: "guest" },
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Checkout failed";
    throw new Error(friendly(msg));
  }

  if (!data || typeof data !== "string") {
    throw new Error("استجابة غير متوقعة من الخادم");
  }

  // ─── Dual-Write Bridge: append `commit` events to inventory ledger (fail-safe) ───
  // Fire-and-forget: failures are logged but never block checkout success.
  void (async () => {
    try {
      const { appendLedgerEventFn } = await import(
        "@/core/inventory/gateway/inventory.functions"
      );
      const LEDGER_LOCATION_ID = "00000000-0000-0000-0000-000000000000";
      await Promise.allSettled(
        input.cart_items.map((item) =>
          appendLedgerEventFn({
            data: {
              entity_id: item.product_id,
              location_id: LEDGER_LOCATION_ID,
              event_type: "commit",
              delta: -Math.abs(item.quantity),
              idempotency_key: `sale_${data}_${item.product_id}`,
              actor_id: input.customer_id,
              context: {
                source: "checkout.sovereign",
                order_id: data,
                quantity: item.quantity,
              },
            },
          }),
        ),
      );
    } catch (err) {
      Tracer.error("hakim-ai", "inventory_ledger_checkout_dual_write_failed", { args: ["[inventory-ledger] checkout dual-write failed:", err] });
    }
  })();

  return data;
};

/** TanStack mutation variant for component callers. */
export function useSovereignCheckout() {
  return useMutation<string, Error, SovereignCheckoutInput>({
    mutationFn: callSovereignCheckout,
    onError: (err) => toast.error(err.message),
  });
}
