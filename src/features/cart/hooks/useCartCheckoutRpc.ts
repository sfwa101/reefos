import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export type PlaceOrderItem = {
  product_id: string;
  product_name: string;
  product_image: string | null;
  price: number;
  quantity: number;
};

export type PlaceOrderPayload = {
  _user_id: string;
  _total: number;
  _payment_method: string;
  _address_id: string | null;
  _notes: string | null;
  _service_type: string;
  _delivery_zone: string | null;
  _items: PlaceOrderItem[];
  // ---- Outbox / atomic side-effect inputs (Phase 1) ----
  // RPC `place_order_atomic` is responsible for:
  //   - debiting the wallet by `_wallet_applied`
  //   - depositing `_change_remainder` into savings_jar (if `_save_change`)
  //   - donating `_change_remainder` (if `_donate_change`)
  //   - crediting `_total_cashback` (restaurants)
  //   - enqueuing WhatsApp / vendor notifications via order_outbox
  // The frontend now ONLY transmits the intent; no client-side mutations.
  _wallet_applied?: number;
  _wallet_shortfall?: number;
  _secondary_payment?: string | null;
  _total_cashback?: number;
  _change_remainder?: number;
  _save_change?: boolean;
  _donate_change?: boolean;
  _tip?: number;
  _promo_code?: string | null;
  _discount?: number;
};

export type PlaceOrderResult =
  | { ok: true; orderId: string }
  | { ok: false; error: string };

/** Map known Postgres / RPC errors to a friendly Arabic toast string. */
const friendlyRpcError = (msg: string): string => {
  if (msg.includes("out_of_stock")) return "أحد المنتجات نفد من المخزون";
  if (msg.includes("product_not_found")) return "منتج غير موجود في الكتالوج";
  if (msg.includes("empty_cart")) return "السلة فارغة";
  if (msg.includes("unauthorized")) return "غير مصرح";
  if (msg.toLowerCase().includes("uuid")) return "بيانات العنوان غير صالحة";
  return "تعذر إنشاء الطلب، حاول مرة أخرى";
};

/**
 * Calls `place_order_atomic` RPC with deep logging.
 * Returns `{ ok, orderId }` on success or `{ ok: false }` on any failure
 * (after surfacing a toast). Caller must early-return on `!ok`.
 */
export const placeOrderAtomic = async (
  payload: PlaceOrderPayload,
): Promise<PlaceOrderResult> => {
  try {
    console.error("RPC_PAYLOAD:", payload);
    // DB signature requires string for _address_id; null is accepted at runtime
    // but the generated types are strict. Cast through unknown to preserve our
    // domain-accurate PlaceOrderPayload type without leaking `any`.
    const args = payload as unknown as Parameters<
      typeof supabase.rpc<"place_order_atomic">
    >[1];
    const { data, error } = await supabase.rpc("place_order_atomic", args);

    if (error) {
      console.error("RPC_ERROR:", error);
      const friendly = friendlyRpcError(error.message || "");
      toast.error(friendly);
      return { ok: false, error: friendly };
    }
    if (!data || typeof data !== "string") {
      console.error("RPC_ERROR: missing order id, got:", data);
      const msg = "استجابة غير متوقعة من الخادم";
      toast.error(msg);
      return { ok: false, error: msg };
    }
    return { ok: true, orderId: data };
  } catch (e) {
    console.error("RPC_EXCEPTION:", e, "PAYLOAD:", payload);
    const msg = "حدث خطأ غير متوقع، حاول مرة أخرى";
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
