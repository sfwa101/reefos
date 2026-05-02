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
};

export type PlaceOrderResult =
  | { ok: true; orderId: string }
  | { ok: false };

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
    const { data, error } = await supabase.rpc(
      "place_order_atomic",
      // RPC signature is generated; this payload matches it 1:1.
      payload as unknown as Parameters<typeof supabase.rpc>[1],
    );

    if (error) {
      console.error("RPC_ERROR:", error);
      toast.error(friendlyRpcError(error.message || ""));
      return { ok: false };
    }
    if (!data || typeof data !== "string") {
      console.error("RPC_ERROR: missing order id, got:", data);
      toast.error("استجابة غير متوقعة من الخادم");
      return { ok: false };
    }
    return { ok: true, orderId: data };
  } catch (e) {
    console.error("RPC_EXCEPTION:", e, "PAYLOAD:", payload);
    toast.error("حدث خطأ غير متوقع، حاول مرة أخرى");
    return { ok: false };
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
      _zone: zoneId,
    });
    if (error) console.warn("[allocation] failed", error);
  } catch (e) {
    console.warn("[allocation] exception", e);
  }
};
