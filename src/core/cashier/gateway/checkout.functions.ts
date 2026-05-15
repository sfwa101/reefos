/**
 * Salsabil OS — Constitution v2.0 · Article 12.1 · Phase C5
 * Layer 3 (Gateway) · Sovereign Price Judge — validated checkout.
 *
 * The Server is the final arbiter of price. Before any order row is
 * inserted via `process_checkout_sovereign`, the server re-runs the
 * Cashier Brain against authoritative DNA and verifies the deterministic
 * `snapshot_hash` matches the hash the client preview produced. Any
 * mismatch (tampered cart, stale DNA, drifted code) hard-aborts the
 * checkout with an Arabic UX error before any side-effect runs.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { computeAuthoritativeSnapshot } from "./cashier.functions";
import { dynamicSb } from "@/integrations/supabase/dynamic";
import { Tracer } from "@/core/system/observability/Tracer";

const itemSchema = z.object({
  product_id: z.string().uuid(),
  quantity: z.number().int().min(1).max(999),
});

const memberTierSchema = z.enum([
  "guest",
  "bronze",
  "silver",
  "gold",
  "vip",
]);

const checkoutSchema = z.object({
  customer_id: z.string().uuid(),
  cart_items: z.array(itemSchema).min(1).max(200),
  delivery_info: z.record(z.string(), z.unknown()).default({}),
  idempotency_key: z.string().uuid(),
  expected_snapshot_hash: z.string().min(8).max(128),
  cashier_context: z
    .object({
      member_tier: memberTierSchema.default("guest"),
      coupon_code: z.string().max(64).nullish(),
      delivery_zone_id: z.string().max(64).nullish(),
      delivery_fee: z.number().finite().min(0).optional(),
      currency: z.string().min(3).max(8).optional(),
    })
    .default({ member_tier: "guest" }),
});

const PRICE_TAMPER_ERROR =
  "عفواً، حدث تلاعب أو خطأ في حسابات الأسعار. يرجى تحديث السلة والمحاولة مرة أخرى.";

export const validatedSovereignCheckoutFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => checkoutSchema.parse(input))
  .handler(async ({ data, context }): Promise<string> => {
    const { supabase, userId } = context;

    if (data.customer_id !== userId) {
      throw new Error("customer_id does not match the authenticated user");
    }

    // 1) Re-run CashierBrain on authoritative DNA (server is the price judge).
    const snapshot = await computeAuthoritativeSnapshot({
      items: data.cart_items.map((i) => ({
        id: i.product_id,
        qty: i.quantity,
      })),
      context: {
        member_tier: data.cashier_context.member_tier,
        coupon_code: data.cashier_context.coupon_code ?? null,
        delivery_zone_id: data.cashier_context.delivery_zone_id ?? null,
        delivery_fee: data.cashier_context.delivery_fee,
        currency: data.cashier_context.currency,
      },
    });

    // 2) Hash veto — deterministic equality, no tolerance.
    if (snapshot.snapshot_hash !== data.expected_snapshot_hash) {
      Tracer.warn("cashier", "cashier_veto_snapshot_hash_mismatch", { args: ["[CASHIER-VETO] snapshot hash mismatch", {
                client: data.expected_snapshot_hash,
                server: snapshot.snapshot_hash,
                actor: userId,
              }] });
      throw new Error(PRICE_TAMPER_ERROR);
    }

    // 3) Hash matched → call the Sovereign Router atomically.
    //    The DB layer re-verifies the snapshot hash against the
    //    cashier_snapshots ledger (Article 7.1 — Sovereign Veto at the source).
    const { data: orderId, error } = await dynamicSb.rpc(
      "process_checkout_sovereign",
      {
        p_customer_id: data.customer_id,
        p_cart_items: data.cart_items,
        p_delivery_info: data.delivery_info,
        p_idempotency_key: data.idempotency_key,
        p_payment_method: "cash_on_delivery",
        p_client_snapshot_hash: data.expected_snapshot_hash,
      },
    );

    if (error) throw new Error(error.message || "Checkout failed");
    if (!orderId || typeof orderId !== "string") {
      throw new Error("استجابة غير متوقعة من الخادم");
    }
    return orderId;
  });
