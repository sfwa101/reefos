# POS Sovereign Recon — Phase POS-1

**Status:** Read-only audit. No code modified.
**Scope:** `src/apps/reef-al-madina/features/pos/**`, `usePosEngine.ts`, downstream RPCs.

---

## 1. POS Math (Pricing) — Where the totals come from

**File:** `src/apps/reef-al-madina/features/pos/hooks/usePosEngine.ts`

- Cart lines store a flat snapshot pulled from the catalog row:
  ```ts
  { product_id, name, price: Number(p.price), qty, image_url }
  ```
- The total is computed **purely on the client** via:
  ```ts
  const subtotal = useMemo(
    () => cart.reduce((s, l) => s + l.price * l.qty, 0),
    [cart],
  );
  ```
- There is **no call to `CashierBrain`**, no preview server fn, no
  `snapshot_hash`, no member tier, no coupon, no zone fee, no rounding policy.
- Pricing source: `fetchPosCatalog()` (`src/lib/sovereignCatalog.ts`) →
  raw `price` column. Tier / promo / loyalty / VAT logic from Layer 4 is
  bypassed entirely.

### 🚨 Article 12.1 Violation
The Server is supposed to be the **final arbiter of price**. The POS today
trusts a client-side `price * qty` reduction and forwards that subtotal as
truth into the cash payment RPC. A tampered cache (`pos.products.cache.v1` in
`localStorage`) directly mutates the amount tendered → ledgered.

---

## 2. Checkout Execution Path

POS "Pay" (`PosQuickPay` → `usePosEngine.checkout`) executes **two raw RPCs
directly against Supabase**, *not* the new validated server fn:

1. `supabase.rpc("process_checkout_sovereign", { p_customer_id, p_cart_items, p_delivery_info, p_idempotency_key })`
2. `supabase.rpc("process_pos_cash_payment", { p_order_id, p_amount: subtotal })`

Plus an offline fast-path that enqueues the **same raw RPC payload** via
`enqueueOfflineMutation` (`src/lib/offlineSyncQueue.ts`) — bypassing any
server-side validation when it eventually drains.

### 🚨 Sovereign Backdoor
- Does **NOT** call `validatedSovereignCheckoutFn`
  (`src/core/cashier/gateway/checkout.functions.ts`).
- Does **NOT** send `expected_snapshot_hash` → no hash veto, no price judge.
- `p_amount` for the cash settlement is `subtotal` from the client reducer.
  A modified browser pays whatever it wants.
- Offline queue replays the same unvalidated payload after reconnect.

This is a **parallel, unauthenticated checkout pipeline** living alongside
the storefront's now-secured one.

---

## 3. Inventory Deduction

POS performs **zero explicit inventory writes**. There is no insert into
`inventory_ledger_events`, no call to any `InventoryBrain` gateway fn, no
ledger append from the client. Stock movement is implicitly delegated to
whatever DB-side trigger fires inside `process_checkout_sovereign` /
`process_pos_cash_payment`.

### 🚨 Article 7.1 Gap
Article 7.1 mandates an **append-only, auditable ledger** as the source of
truth for stock. The POS currently:
- Has no client- or gateway-level dual-write to `inventory_ledger_events`.
- Has no idempotent `event_id` per line.
- Has no compensating event if the cash RPC half-fails (note that the
  current code logs a warning but leaves the order created — inventory is
  decremented while the till is not balanced).
- Cannot be reconciled against the ledger because it never speaks the
  ledger's vocabulary.

If the legacy trigger silently mutates a `stock_qty` column instead of
appending an event, every POS sale is invisible to the Inventory Brain.

---

## 4. Architectural Gap Summary

| Concern | Storefront (post Phase C5) | POS (today) |
|---|---|---|
| Price source | `CashierBrain` server fn + DNA | client `price*qty` |
| Hash veto | `expected_snapshot_hash` enforced | none |
| Checkout fn | `validatedSovereignCheckoutFn` | raw `supabase.rpc` |
| Cash settlement | n/a (gateway) | raw `process_pos_cash_payment` |
| Offline replay | n/a | raw RPC payload re-queued |
| Inventory ledger | via sovereign router | implicit / unknown trigger |
| Tier / coupon / zone | full context | ignored |

---

## 5. Surgical Plan — Wire POS to the Sovereign Systems

> Read-only phase ends here. The following is the proposed Phase POS-2 plan.

1. **Adopt CashierBrain previews in POS**
   - Add a POS-flavored `useCashierPreview` call inside `usePosEngine`
     keyed on the cart signature. Pass `{ member_tier: "guest", currency,
     channel: "pos" }` context (member tier comes from a future scanned
     loyalty card; default `guest`).
   - Replace `subtotal` exposed by the engine with `preview.totals.grand_total`
     and surface line-level breakdowns (discount, VAT) to `PosQuickPay`.
   - Track `cashierSnapshotHash` + `cashierSnapshotFresh` exactly like
     `useCartCalculations` does.

2. **Route checkout through `validatedSovereignCheckoutFn`**
   - Replace the direct `supabase.rpc("process_checkout_sovereign", …)` call
     with `validatedSovereignCheckoutFn({ … expected_snapshot_hash })`.
   - Block "Pay" while `cashierSnapshotFresh === false`.
   - Keep `process_pos_cash_payment` as the *settlement* leg, but call it
     with the **server-returned** authoritative total, not the local
     subtotal. Best fix: extend the validated fn to optionally take a
     `pos_settlement: { tendered, payment_method }` and perform both
     legs server-side in one transaction so the till can never disagree
     with the order.

3. **Harden the offline queue**
   - Stop enqueuing raw RPC payloads. Enqueue a serialized
     `validatedSovereignCheckoutFn` request (items + context +
     expected hash captured at scan time) so the price judge re-runs at
     drain time and rejects stale carts cleanly.
   - Stamp each queued op with `idempotency_key` already present.

4. **Explicit Inventory Ledger writes (Article 7.1)**
   - Have the server fn (or the RPC it wraps) append one
     `inventory_ledger_events` row per line with
     `{ event_id = uuid(), reason: "pos_sale", order_id, branch_id,
        product_id, qty: -line.qty, actor: cashier_id, ts }`.
   - Remove any reliance on legacy `stock_qty` triggers; if a trigger
     still exists, gate it behind a feature flag and shadow-compare.
   - Add a reconciliation server fn `verifyPosSale(order_id)` that asserts
     ledger sum == order line sum before the shift can close.

5. **Shift integrity**
   - Move `pos_shifts` counter updates server-side inside the same
     transaction so a half-failed checkout cannot drift the shift totals
     (currently a best-effort client-side `update`).

6. **Delete the backdoor**
   - Once (1)–(5) ship, revoke direct client RLS access to
     `process_checkout_sovereign` and `process_pos_cash_payment` so the
     only path into the order/ledger pipeline is the validated server fn.

---

## 6. Halt

Recon complete. Awaiting authorization before touching code (Phase POS-2).
