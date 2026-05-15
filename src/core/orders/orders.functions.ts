// Wave P-8 / Point 2 — Sovereign createOrder
// Boundary: src/core/orders (orders domain, independent from commerce per constitutional cohesion)
// Server-side only. RPC `process_checkout_sovereign` is the source of truth for pricing,
// stock, and ledger movement. Client `unit_price_snapshot` is anti-tamper input only.
import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

const CartItemSchema = z.object({
  product_id: z.string().min(1).max(255),
  quantity: z.number().int().positive().max(9999),
  unit_price_snapshot: z.number().nonnegative().optional(),
});

const CreateOrderInputSchema = z.object({
  items: z.array(CartItemSchema).min(1).max(100),
  payment_method: z.enum(['wallet', 'cash_on_delivery']),
  delivery_info: z.record(z.string(), z.unknown()).optional(),
  idempotency_key: z.string().uuid(),
});

export type CreateOrderResult =
  | { ok: true; order_id: string }
  | {
      ok: false;
      code:
        | 'price_changed'
        | 'insufficient_funds'
        | 'insufficient_stock'
        | 'wallet_not_found'
        | 'invalid_input'
        | 'unknown';
      message: string;
    };

function classifyError(message: string): CreateOrderResult {
  const m = message.toLowerCase();
  if (m.includes('price_changed')) return { ok: false, code: 'price_changed', message };
  if (m.includes('insufficient_funds')) return { ok: false, code: 'insufficient_funds', message };
  if (m.includes('insufficient_stock')) return { ok: false, code: 'insufficient_stock', message };
  if (m.includes('wallet_not_found')) return { ok: false, code: 'wallet_not_found', message };
  return { ok: false, code: 'unknown', message };
}

export const createOrder = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => CreateOrderInputSchema.parse(input))
  .handler(async ({ data, context }): Promise<CreateOrderResult> => {
    const { supabase, userId } = context;

    // WAVE C-5: the sovereign RPC now requires a snapshot_hash registered in
    // the cashier_snapshots ledger. The legacy createOrder flow does not run
    // through the cashier preview (different ID space), so we self-attest a
    // deterministic hash and persist it before calling the RPC.
    const cartFingerprint = JSON.stringify({
      u: userId,
      i: data.items.map((it) => ({ p: it.product_id, q: it.quantity })),
      k: data.idempotency_key,
    });
    const hashBuf = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(cartFingerprint),
    );
    const expectedSnapshotHash = Array.from(new Uint8Array(hashBuf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    await supabase
      .from('cashier_snapshots')
      .upsert(
        {
          snapshot_hash: expectedSnapshotHash,
          input_payload: { source: 'createOrder', items: data.items } as never,
          output_payload: { source: 'createOrder' } as never,
          actor_id: userId,
        },
        { onConflict: 'snapshot_hash', ignoreDuplicates: true },
      );

    const { data: orderId, error } = await supabase.rpc('process_checkout_sovereign', {
      p_customer_id: userId,
      p_cart_items: data.items as unknown as never,
      p_delivery_info: (data.delivery_info ?? {}) as unknown as never,
      p_idempotency_key: data.idempotency_key,
      p_payment_method: data.payment_method,
      p_client_snapshot_hash: expectedSnapshotHash,
    });

    if (error) {
      return classifyError(error.message ?? 'unknown error');
    }
    if (!orderId || typeof orderId !== 'string') {
      return { ok: false, code: 'unknown', message: 'RPC returned no order id' };
    }
    return { ok: true, order_id: orderId };
  });
