/**
 * Salsabil OS — Constitution v2.0 · Article 12.1
 * Layer 3 (Gateway) · Cashier Brain — server functions.
 *
 * Bridges Layer 4 (`CashierBrain`) to the database. Reads authoritative
 * `ProductFinancialDNA` from `view_product_financial_dna`, never trusts
 * the client for prices.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { calculateCart } from "@/core/cashier/domain/CashierBrain";
import type {
  CartLineInput,
  CartSnapshot,
  CashierContext,
  ProductFinancialDNA,
} from "@/core/cashier/domain/types";
import type { JsonObject } from "@/core/commerce/knowledge/dna.types";
import { Tracer } from "@/core/system/observability/Tracer";

// ─────────────────────────── Schemas ───────────────────────────

const cartItemSchema = z.object({
  id: z.string().uuid(),
  qty: z.number().int().min(0).max(999),
  modifiers: z
    .array(
      z.object({
        id: z.string().min(1).max(128),
        label: z.string().max(256).optional(),
        unit_price_delta: z.number().finite(),
      }),
    )
    .max(32)
    .optional(),
});

const memberTierSchema = z.enum([
  "guest",
  "bronze",
  "silver",
  "gold",
  "vip",
]);

const previewSchema = z.object({
  items: z.array(cartItemSchema).min(1).max(200),
  context: z.object({
    member_tier: memberTierSchema.default("guest"),
    coupon_code: z.string().max(64).nullish(),
    delivery_zone_id: z.string().max(64).nullish(),
    delivery_fee: z.number().finite().min(0).optional(),
    currency: z.string().min(3).max(8).optional(),
  }),
});

// ─────────────────────────── Helpers ───────────────────────────

type DnaRow = {
  id: string;
  base_price: number | string | null;
  currency: string | null;
  tax_class: string | null;
  pricing_rules: JsonObject | null;
};

const rowToDna = (row: DnaRow): ProductFinancialDNA => ({
  currency: row.currency ?? "EGP",
  base_price: Number(row.base_price ?? 0),
  tax_class: row.tax_class ?? null,
  pricing_rules: (row.pricing_rules ?? {}) as JsonObject,
});

// ─────────────────────────── Authoritative computation ───────────────────────────

/**
 * Server-only helper that loads authoritative DNA and runs CashierBrain.
 * Reusable by any server function that must arbitrate price (e.g. the
 * Sovereign Checkout price judge).
 */
export type CashierComputeInput = z.infer<typeof previewSchema>;

export async function computeAuthoritativeSnapshot(
  data: CashierComputeInput,
): Promise<CartSnapshot> {
  const ids = Array.from(new Set(data.items.map((i) => i.id)));

  const { data: rows, error } = await supabase
    .from("view_product_financial_dna")
    .select("id, base_price, currency, tax_class, pricing_rules")
    .in("id", ids);

  if (error) {
    throw new Error(`Failed to load product financial DNA: ${error.message}`);
  }

  const dnaById = new Map<string, ProductFinancialDNA>();
  for (const r of (rows ?? []) as DnaRow[]) {
    dnaById.set(r.id, rowToDna(r));
  }

  const lines: CartLineInput[] = [];
  const missing: string[] = [];
  for (const item of data.items) {
    const dna = dnaById.get(item.id);
    if (!dna) {
      missing.push(item.id);
      continue;
    }
    lines.push({
      id: item.id,
      dna,
      qty: item.qty,
      modifiers: item.modifiers,
    });
  }

  if (missing.length > 0) {
    throw new Error(
      `Cashier preview: ${missing.length} product(s) missing financial DNA: ${missing.join(",")}`,
    );
  }

  const context: CashierContext = {
    member_tier: data.context.member_tier,
    coupon_code: data.context.coupon_code ?? null,
    delivery_zone_id: data.context.delivery_zone_id ?? null,
    delivery_fee: data.context.delivery_fee,
    currency: data.context.currency,
  };

  return calculateCart(lines, context);
}

export const cashierPreviewSchema = previewSchema;

// ─────────────────────────── Gateway ───────────────────────────

/**
 * Pure preview — fetches authoritative DNA, runs CashierBrain, returns
 * the deterministic `CartSnapshot`. Side-effect free.
 */
export const previewCashierFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => previewSchema.parse(input))
  .handler(async ({ data }): Promise<CartSnapshot> => {
    const snapshot = await computeAuthoritativeSnapshot(data);

    // ── Append-only Ledger (Article 7.1) — fire-and-forget ────────
    // Non-blocking: do NOT await. The preview response returns
    // immediately; ledger writes happen in the background.
    void (async () => {
      try {
        const { data: authData } = await supabase.auth.getUser();
        const actorId = authData?.user?.id ?? null;

        const { error: ledgerError } = await supabase
          .from("cashier_snapshots")
          .upsert(
            {
              snapshot_hash: snapshot.snapshot_hash,
              input_payload: {
                items: data.items,
                context: data.context,
              } as unknown as JsonObject,
              output_payload: snapshot as unknown as JsonObject,
              actor_id: actorId,
            },
            { onConflict: "snapshot_hash", ignoreDuplicates: true },
          );

        if (ledgerError) {
          Tracer.error("cashier", "cashier_ledger_insert_failed", { args: ["[CASHIER-LEDGER] insert failed:", ledgerError.message] });
        }
      } catch (err) {
        Tracer.error("cashier", "cashier_ledger_unexpected_error", { args: ["[CASHIER-LEDGER] unexpected error:", err] });
      }
    })();

    return snapshot;
  });
