import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

/** Single line item inside a fulfillment wave. */
export type PlaceOrderItem = {
  product_id: string;
  product_name: string;
  product_image: string | null;
  price: number;
  quantity: number;
  is_preorder?: boolean;
  requires_downpayment?: boolean;
};

/** One delivery wave inside an order. */
export type PlaceOrderFulfillment = {
  sequence?: number;
  status?:
    | "pending"
    | "preparing"
    | "ready"
    | "out_for_delivery"
    | "delivered"
    | "cancelled";
  delivery_method_id?: string | null;
  scheduled_for?: string | null; // ISO timestamp; null = ASAP
  eta_minutes?: number | null;
  delivery_fee?: number;
  notes?: string | null;
  items: PlaceOrderItem[];
};

/**
 * Phase 13.2 — JSONB payload accepted by `place_order_atomic_v2`.
 * The order header carries the financial truth; `fulfillments[]` carries the
 * logistics truth (one wave per delivery slot / pre-order batch).
 */
export type PlaceOrderPayload = {
  user_id: string;
  total: number;
  payment_method: string;
  address_id: string | null;
  notes: string | null;
  service_type: string;
  delivery_zone: string | null;
  // Money breakdown
  wallet_applied?: number;
  wallet_shortfall?: number;
  secondary_payment?: string | null;
  total_cashback?: number;
  change_remainder?: number;
  save_change?: boolean;
  donate_change?: boolean;
  tip?: number;
  promo_code?: string | null;
  discount?: number;
  // Phase 12.7 / 12.8 / 13.1
  tip_amount?: number;
  charity_amount?: number;
  charity_cause_id?: string | null;
  is_gift?: boolean;
  gift_message?: string | null;
  upfront_payment_required?: number;
  upfront_payment_collected?: number;
  // Logistics
  fulfillments: PlaceOrderFulfillment[];
};

export type PlaceOrderResult =
  | { ok: true; orderId: string }
  | { ok: false; error: string };

const friendlyRpcError = (msg: string): string => {
  if (msg.includes("out_of_stock")) return "أحد المنتجات نفد من المخزون";
  if (msg.includes("invalid_product_id"))
    return "أحد المنتجات في سلتك لم يعد متوفراً، يرجى تحديث السلة.";
  if (msg.includes("product_not_found")) return "منتج غير موجود في الكتالوج";
  if (msg.includes("empty_cart") || msg.includes("empty_fulfillment"))
    return "السلة فارغة";
  if (msg.includes("invalid_payment_configuration"))
    return "رصيد المحفظة لا يكفي، يرجى اختيار طريقة دفع إضافية.";
  if (msg.includes("insufficient_wallet_balance"))
    return "رصيد المحفظة غير كافٍ";
  if (msg.includes("kyc_required"))
    return "يجب توثيق حسابك لإتمام هذه المعاملة.";
  if (msg.includes("limit_exceeded"))
    return "لقد تجاوزت حد التحويل المسموح لك.";
  if (msg.includes("unauthorized")) return "غير مصرح";
  if (msg.toLowerCase().includes("uuid")) return "بيانات العنوان غير صالحة";
  return "DB Error: " + msg;
};

/**
 * Phase 13.2 — Calls the multi-fulfillment RPC `place_order_atomic_v2`.
 * Sends a single JSONB payload (header + fulfillments + items). The DB
 * function inserts everything inside one transaction and rolls back on any
 * failure.
 */
export const placeOrderAtomic = async (
  payload: PlaceOrderPayload,
): Promise<PlaceOrderResult> => {
  try {
    console.error("RPC_PAYLOAD_V2:", payload);
    console.time("Checkout-Lat");
    const args = { _payload: payload } as unknown as Parameters<
      typeof supabase.rpc<"place_order_atomic_v2">
    >[1];

    // Phase 13.20 — client-side hard timeout to prevent indefinite UI freeze
    // even if the network call or DB lock hangs beyond expected limits.
    const TIMEOUT_MS = 20_000;
    const rpcPromise = supabase.rpc(
      "place_order_atomic_v2" as "place_order_atomic_v2",
      args,
    );
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error("checkout_timeout")),
        TIMEOUT_MS,
      ),
    );

    const { data, error } = (await Promise.race([
      rpcPromise,
      timeoutPromise,
    ])) as Awaited<typeof rpcPromise>;
    console.timeEnd("Checkout-Lat");

    if (error) {
      console.error("RPC_ERROR_V2:", error);
      const friendly = friendlyRpcError(error.message || "");
      toast.error(friendly);
      return { ok: false, error: friendly };
    }
    if (!data || typeof data !== "string") {
      console.error("RPC_ERROR_V2: missing order id, got:", data);
      const msg = "استجابة غير متوقعة من الخادم";
      toast.error(msg);
      return { ok: false, error: msg };
    }
    return { ok: true, orderId: data };
  } catch (e) {
    try { console.timeEnd("Checkout-Lat"); } catch { /* timer may not exist */ }
    const isTimeout = e instanceof Error && e.message === "checkout_timeout";
    console.error("RPC_EXCEPTION_V2:", e, "PAYLOAD:", payload);
    const msg = isTimeout
      ? "عذراً، الخادم مشغول حالياً، حاول مرة أخرى"
      : "حدث خطأ غير متوقع، حاول مرة أخرى";
    toast.error(msg);
    return { ok: false, error: msg };
  }
};

/** Best-effort multi-warehouse allocation. Non-blocking; logs only on error. */
export const allocateOrderInventory = async (
  orderId: string,
  zoneId: string | null | undefined,
): Promise<void> => {
  try {
    const { error } = await supabase.rpc("allocate_order_inventory", {
      _order_id: orderId,
      _zone: zoneId ?? undefined,
    });
    if (error) console.warn("[allocation] failed", error);
  } catch (e) {
    console.warn("[allocation] exception", e);
  }
};
