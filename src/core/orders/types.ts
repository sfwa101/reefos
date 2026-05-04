/**
 * Phase 13.1 — Order domain contracts.
 *
 * These types live OUTSIDE the auto-generated `src/integrations/supabase/types.ts`
 * (which we never edit) and provide a clean camelCase, nested view of an order:
 *
 *   Order (financial header)
 *    └── fulfillments[]            ← one per delivery wave
 *         ├── status / ETA / driver / tracking
 *         └── items[]              ← order_items linked via fulfillment_id
 *
 * `mapOrderRow` is a pure helper that takes raw Supabase rows (typed via the
 * generated `Database` type) and assembles the nested domain object.
 * No `any` anywhere — raw inputs are typed via `Database['public']['Tables']`.
 */
import type { Database } from "@/integrations/supabase/types";

type OrderRow = Database["public"]["Tables"]["orders"]["Row"];
type OrderItemRow = Database["public"]["Tables"]["order_items"]["Row"];
// `fulfillments` may not be in the regenerated types yet — fall back to a
// structural row shape so this file always type-checks.
type FulfillmentRowGenerated = Database["public"]["Tables"] extends {
  fulfillments: { Row: infer R };
}
  ? R
  : never;
type FulfillmentRowFallback = {
  id: string;
  order_id: string;
  sequence: number;
  status: FulfillmentStatus;
  delivery_method_id: string | null;
  scheduled_for: string | null;
  eta_minutes: number | null;
  driver_id: string | null;
  tracking_url: string | null;
  delivery_fee: number | string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};
export type FulfillmentRow = [FulfillmentRowGenerated] extends [never]
  ? FulfillmentRowFallback
  : FulfillmentRowGenerated;

export type FulfillmentStatus =
  | "pending"
  | "preparing"
  | "ready"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";

export type OrderItem = {
  id: string;
  orderId: string;
  fulfillmentId: string | null;
  productId: string;
  productName: string;
  productImage: string | null;
  price: number;
  quantity: number;
  storeId: string | null;
  isPreorder: boolean;
  requiresDownpayment: boolean;
  createdAt: string;
};

export type Fulfillment = {
  id: string;
  orderId: string;
  sequence: number;
  status: FulfillmentStatus;
  deliveryMethodId: string | null;
  scheduledFor: string | null;
  etaMinutes: number | null;
  driverId: string | null;
  trackingUrl: string | null;
  deliveryFee: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
};

export type Order = {
  id: string;
  userId: string;
  status: string;
  total: number;
  paymentMethod: string | null;
  addressId: string | null;
  notes: string | null;
  serviceType: string;
  deliveryZone: string | null;
  // Money breakdown (Phase 12.7 / 13.1)
  walletApplied: number;
  walletShortfall: number;
  totalCashback: number;
  tipAmount: number;
  charityAmount: number;
  charityCauseId: string | null;
  discount: number;
  promoCode: string | null;
  // Gift mode (Phase 12.8 / 13.1)
  isGift: boolean;
  giftMessage: string | null;
  // Upfront payments (Phase 13.1)
  upfrontPaymentRequired: number;
  upfrontPaymentCollected: number;
  // Timestamps
  createdAt: string;
  updatedAt: string;
  // Nested
  fulfillments: Fulfillment[];
};

const num = (v: number | string | null | undefined): number => {
  if (v == null) return 0;
  const n = typeof v === "string" ? Number(v) : v;
  return Number.isFinite(n) ? n : 0;
};

const mapItem = (r: OrderItemRow): OrderItem => ({
  id: r.id,
  orderId: r.order_id,
  fulfillmentId: (r as OrderItemRow & { fulfillment_id?: string | null })
    .fulfillment_id ?? null,
  productId: r.product_id ?? "",
  productName: r.product_name,
  productImage: r.product_image ?? null,
  price: num(r.price),
  quantity: r.quantity,
  storeId: r.store_id ?? null,
  isPreorder:
    (r as OrderItemRow & { is_preorder?: boolean }).is_preorder ?? false,
  requiresDownpayment:
    (r as OrderItemRow & { requires_downpayment?: boolean })
      .requires_downpayment ?? false,
  createdAt: r.created_at,
});

const mapFulfillment = (
  r: FulfillmentRow,
  items: OrderItemRow[],
): Fulfillment => ({
  id: r.id,
  orderId: r.order_id,
  sequence: r.sequence,
  status: r.status,
  deliveryMethodId: r.delivery_method_id,
  scheduledFor: r.scheduled_for,
  etaMinutes: r.eta_minutes,
  driverId: r.driver_id,
  trackingUrl: r.tracking_url,
  deliveryFee: num(r.delivery_fee),
  notes: r.notes,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
  items: items.filter((i) => {
    const fid =
      (i as OrderItemRow & { fulfillment_id?: string | null }).fulfillment_id ??
      null;
    return fid === r.id;
  }).map(mapItem),
});

/**
 * Pure mapper — assembles an Order with nested fulfillments and items from raw
 * Supabase rows. Items not yet linked to a fulfillment (legacy orders) are
 * exposed via the synthetic `unassigned` fulfillment so renderers don't lose
 * them.
 */
export function mapOrderRow(
  order: OrderRow,
  fulfillments: FulfillmentRow[],
  items: OrderItemRow[],
): Order {
  const o = order as OrderRow & {
    tip_amount?: number | string | null;
    charity_amount?: number | string | null;
    charity_cause_id?: string | null;
    is_gift?: boolean | null;
    gift_message?: string | null;
    upfront_payment_required?: number | string | null;
    upfront_payment_collected?: number | string | null;
  };

  const sortedFulfillments = [...fulfillments].sort(
    (a, b) => a.sequence - b.sequence,
  );
  const mapped = sortedFulfillments.map((f) => mapFulfillment(f, items));

  // Legacy items with no fulfillment_id → synthetic sequence 0 group
  const unassigned = items.filter(
    (i) =>
      ((i as OrderItemRow & { fulfillment_id?: string | null })
        .fulfillment_id ?? null) === null,
  );
  if (unassigned.length > 0) {
    mapped.unshift({
      id: `legacy-${order.id}`,
      orderId: order.id,
      sequence: 0,
      status: (order.status as FulfillmentStatus) ?? "pending",
      deliveryMethodId: null,
      scheduledFor: null,
      etaMinutes: null,
      driverId: null,
      trackingUrl: null,
      deliveryFee: 0,
      notes: null,
      createdAt: order.created_at,
      updatedAt: order.updated_at,
      items: unassigned.map(mapItem),
    });
  }

  return {
    id: order.id,
    userId: order.user_id,
    status: order.status,
    total: num(order.total),
    paymentMethod: order.payment_method,
    addressId: order.address_id,
    notes: order.notes,
    serviceType: order.service_type,
    deliveryZone: order.delivery_zone,
    walletApplied: num(order.wallet_applied),
    walletShortfall: num(order.wallet_shortfall),
    totalCashback: num(order.total_cashback),
    tipAmount: num(o.tip_amount ?? order.tip),
    charityAmount: num(o.charity_amount),
    charityCauseId: o.charity_cause_id ?? null,
    discount: num(order.discount),
    promoCode: order.promo_code,
    isGift: o.is_gift ?? false,
    giftMessage: o.gift_message ?? null,
    upfrontPaymentRequired: num(o.upfront_payment_required),
    upfrontPaymentCollected: num(o.upfront_payment_collected),
    createdAt: order.created_at,
    updatedAt: order.updated_at,
    fulfillments: mapped,
  };
}
