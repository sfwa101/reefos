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
import { supabase } from "@/integrations/supabase/client";

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
  const args = {
    p_customer_id: input.customer_id,
    p_cart_items: input.cart_items,
    p_delivery_info: input.delivery_info ?? {},
    p_idempotency_key: input.idempotency_key,
  } as unknown as Parameters<
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (typeof supabase.rpc<any>)
  >[1];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc(
    "process_checkout_sovereign",
    args,
  );
  if (error) throw new Error(friendly(error.message || "Checkout failed"));
  if (!data || typeof data !== "string") throw new Error("استجابة غير متوقعة من الخادم");
  return data;
};

/** TanStack mutation variant for component callers. */
export function useSovereignCheckout() {
  return useMutation<string, Error, SovereignCheckoutInput>({
    mutationFn: callSovereignCheckout,
    onError: (err) => toast.error(err.message),
  });
}
