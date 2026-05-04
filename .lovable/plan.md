
# Phase 13.1 — Multi-Fulfillment & Pre-order Architecture

Backend-only phase. Zero UI changes. Establishes the data foundation for orders that mix instant delivery, scheduled pre-orders, and items requiring upfront deposits.

## Why "Order → Fulfillments → Items"

Today: one `orders` row owns N `order_items` directly. There is one status, one ETA, one delivery_zone — so a cart that mixes "fresh meat now" + "wedding cake next week" cannot be modeled honestly. We splice both into one row and lie about timing.

After: each `orders` row owns N `fulfillments` (one per delivery wave / pickup slot / pre-order batch), and each `fulfillments` row owns its own slice of `order_items`. Every wave gets its own status, ETA, driver, and tracking URL. The order header stays as the financial truth (totals, payments, gift mode) while fulfillments carry the logistics truth.

```text
orders (financial header)
 └── fulfillments[] (one per delivery wave)
      ├── status, scheduled_for, eta_minutes, driver_id, tracking_url
      └── order_items[] (rows with fulfillment_id = this fulfillment)
```

Backwards compatible: `order_items.fulfillment_id` is nullable, legacy rows keep working until backfilled.

## DB Migration (single transaction)

### 1. `orders` — new columns (additive only)
- `tip_amount numeric(12,2) NOT NULL DEFAULT 0` — replaces legacy `tip` going forward; both kept until code switches over
- `charity_amount numeric(12,2) NOT NULL DEFAULT 0`
- `charity_cause_id text` — free-form key (food / hospitals / orphans / general)
- `is_gift boolean NOT NULL DEFAULT false`
- `gift_message text`
- `upfront_payment_required numeric(12,2) NOT NULL DEFAULT 0`
- `upfront_payment_collected numeric(12,2) NOT NULL DEFAULT 0`
- CHECK: `upfront_payment_collected >= 0 AND upfront_payment_collected <= upfront_payment_required + 0.01`

### 2. `fulfillment_status` enum
`pending | preparing | ready | out_for_delivery | delivered | cancelled`
(Extra `ready` slot for pickup-style waves; cheap to ship now, hard to add later.)

### 3. `fulfillments` table
```sql
id                  uuid PK default gen_random_uuid()
order_id            uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE
sequence            smallint NOT NULL DEFAULT 1   -- 1, 2, 3 within an order
status              fulfillment_status NOT NULL DEFAULT 'pending'
delivery_method_id  uuid REFERENCES delivery_methods(id) ON DELETE SET NULL
scheduled_for       timestamptz                    -- null = ASAP
eta_minutes         integer
driver_id           uuid REFERENCES drivers(id) ON DELETE SET NULL
tracking_url        text
delivery_fee        numeric(12,2) NOT NULL DEFAULT 0  -- per-wave fee
notes               text
created_at          timestamptz NOT NULL DEFAULT now()
updated_at          timestamptz NOT NULL DEFAULT now()
UNIQUE (order_id, sequence)
```
Indexes: `(order_id)`, `(driver_id)`, `(status)`, `(scheduled_for)` partial where status not in (delivered, cancelled).
Trigger: reuse existing `set_updated_at()` if present, else create one.

### 4. `order_items` — new columns
- `fulfillment_id uuid REFERENCES fulfillments(id) ON DELETE SET NULL` (nullable for legacy)
- `is_preorder boolean NOT NULL DEFAULT false`
- `requires_downpayment boolean NOT NULL DEFAULT false`
- Index `(fulfillment_id)`

### 5. RLS for `fulfillments`
Mirror `orders` policies exactly:
- `Users_Read_Own_Fulfillments` — `EXISTS (orders WHERE id = order_id AND user_id = auth.uid())`
- `Admin_Read_Fulfillments` — admin role check
- `Admin_Update_Fulfillments` — admin role check
- `Drivers_Read_Assigned_Fulfillments` — `driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid())`
- `Drivers_Update_Assigned_Fulfillments` — same predicate (for status/tracking updates)
- `System_Insert_Fulfillments` — service role only (orders are created by RPC)

## TypeScript contracts

`src/integrations/supabase/types.ts` is auto-generated — do NOT touch it. Instead create a hand-rolled domain contract:

`src/core/orders/types.ts`
- `FulfillmentStatus` union matching the enum
- `Fulfillment` shape (camelCase mirror of the DB row + `items: OrderItem[]`)
- `OrderItem` shape with `fulfillmentId`, `isPreorder`, `requiresDownpayment`
- `Order` shape including `tipAmount`, `charityAmount`, `charityCauseId`, `isGift`, `giftMessage`, `upfrontPaymentRequired`, `upfrontPaymentCollected`, `fulfillments: Fulfillment[]`
- A small `mapOrderRow(row, fulfillmentRows, itemRows)` pure function that takes raw Supabase row shapes (typed via the generated `Database` types) and returns the nested domain `Order`. Useful when later phases load orders.

No `any`. All raw row inputs typed via `Database['public']['Tables']['…']['Row']`.

## Out of scope this phase
- No UI changes (Cart, Admin, Vendor, Driver dashboards untouched).
- No edits to `place_order_atomic` RPC (next phase will rewrite it to insert one fulfillment per logistics group).
- No backfill of historic orders — they continue to render with `fulfillments = []` and the legacy single-status field.

## Files

- New SQL migration (run via supabase migration tool):
  - adds columns to `orders`
  - creates `fulfillment_status` enum
  - creates `fulfillments` table + indexes + RLS
  - adds columns + index to `order_items`
- New file `src/core/orders/types.ts` — domain types + `mapOrderRow` helper.

## Verification
- `tsc --noEmit` clean.
- `psql -c "\d fulfillments"` shows the table with all FKs and policies.
- Existing `orders` reads still work because every new column has a default.
