// Profit Observation Gateway — Wave R-1 · Batch 6.
// Admin-only handlers for the immutable admin_override_logs feed and admin
// approval entries.
import { createServerFn } from "@tanstack/react-start";
import { requireAdmin } from "@/integrations/supabase/admin-middleware";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SbAny = any;

export type OverrideLogRow = {
  id: string;
  admin_user_id: string;
  product_id: string | null;
  cart_id: string | null;
  order_id: string | null;
  original_grand_total: number | null;
  overridden_grand_total: number | null;
  reason: string;
  loss_prevention_reason: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata: Record<string, any>;
  created_at: string;
};

export const listAdminOverrideLogsFn = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async ({ context }): Promise<OverrideLogRow[]> => {
    const sb = context.supabase as SbAny;
    const { data, error } = await sb
      .from("admin_override_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return (data ?? []) as OverrideLogRow[];
  });

export const recordAdminOverrideApprovalFn = createServerFn({ method: "POST" })
  .inputValidator((d: {
    source_log_id: string;
    product_id: string | null;
    cart_id: string | null;
    order_id: string | null;
    original_grand_total: number | null;
    overridden_grand_total: number | null;
    loss_prevention_reason: string | null;
    justification: string;
  }) => {
    const justification = String(d?.justification ?? "").trim();
    if (justification.length < 10) throw new Error("justification_too_short");
    if (justification.length > 1000) throw new Error("justification_too_long");
    const source_log_id = String(d?.source_log_id ?? "").trim();
    if (!source_log_id) throw new Error("missing_source_log_id");
    return {
      source_log_id,
      product_id: d.product_id ?? null,
      cart_id: d.cart_id ?? null,
      order_id: d.order_id ?? null,
      original_grand_total: d.original_grand_total ?? null,
      overridden_grand_total: d.overridden_grand_total ?? null,
      loss_prevention_reason: d.loss_prevention_reason ?? null,
      justification,
    };
  })
  .middleware([requireAdmin])
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const sb = context.supabase as SbAny;
    const { error } = await sb.from("admin_override_logs").insert({
      admin_user_id: context.userId,
      product_id: data.product_id,
      cart_id: data.cart_id,
      order_id: data.order_id,
      original_grand_total: data.original_grand_total,
      overridden_grand_total: data.overridden_grand_total,
      reason: `اعتماد إداري: ${data.justification}`,
      loss_prevention_reason: data.loss_prevention_reason,
      metadata: { reviewed_log_id: data.source_log_id, action: "approve_override" },
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
