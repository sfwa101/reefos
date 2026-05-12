# INVENTORY RUNTIME — RECON REPORT
**Phase 1 · Unified Inventory Runtime · Read-Only Reconnaissance**
Generated: 2026-05-12 · Auditor: Principal Backend Architect

---

## 1. Executive Summary

The codebase has **three parallel, partially-integrated inventory systems** and **no append-only ledger**. Stock is mutated **in-place** via SQL functions during checkout RPCs. There is **multi-location infrastructure** (`warehouses` + `inventory_locations`) and a **reservation field** (`inventory_locations.reserved`), but **no event log, no idempotency on stock movements, and no temporal audit trail**. Constitution v2.0 Article 7.1 (Append-Only `StockLedgerEvent`) and Chapter 12 (`InventoryReservation` lifecycle) are **NOT yet satisfied**.

**Verdict:** Foundation for distributed inventory exists. Ledger is missing. We can wrap → never replace.

---

## 2. Database Reality

### 2.1 Stock-bearing tables (3 systems coexist)

| Table | Stock Column | Reserved? | Multi-Location? | Purpose |
|---|---|---|---|---|
| `usa_products` | `stock_qty numeric(14,3)` | ❌ | ❌ (single number per product) | **Legacy monolith** — current source of truth for storefront |
| `inventory_locations` | `stock int`, `reserved int`, `reorder_point` | ✅ (`reserved`) | ✅ (`product_id × warehouse_id` unique) | **Distributed inventory** — partial integration |
| `vendor_inventory` | `stock_level int` | ❌ | per-vendor | Vendor catalog (FK → `global_catalog`, NOT `usa_products`) |
| `salsabil_inventory_matrix` | `availability_data jsonb` | encoded in JSON | per `sku_id × location_code` | **Sovereign SKU layer** — used by Admin Inventory page |

### 2.2 Supporting tables present
- `warehouses` (id, code, type, vendor_id, served_zones, priority, geography Point) — **rich, ready**
- `nested_stock_breakdown(productId)` RPC — exists
- `upsert_inventory_matrix` RPC — exists
- `resolve_fulfillment` RPC — exists

### 2.3 Tables that DO NOT exist (required by Constitution v2.0)
- ❌ `inventory_ledger` / `stock_ledger_events` (append-only)
- ❌ `inventory_reservations` (separate table with TTL/expiry)
- ❌ `stock_movements` (typed events: receive/sell/return/adjust/transfer/waste)
- ❌ `inventory_snapshots` (materialized current state per location)

> Note: `ledger_entries` exists but is **financial wallet ledger**, not inventory.

---

## 3. Stock Mutation Sites (Where stock changes today)

### 3.1 SQL — In-place UPDATE during checkout
| Migration | Behavior |
|---|---|
| `20260501194228…` | `-- Insert order items + deduct stock` → direct `UPDATE … SET stock_qty = stock_qty - qty` |
| `20260503001046…` | Items + decrement stock in one tx |
| `20260504194810…` | Fulfillments + items + decrement stock |
| `20260504203452…` | "Best-effort stock decrement; never blocks the order" |
| `20260508025007…` | Step 4: Decrement stock |
| `20260430021909…` | **Closest to ledger** — `available_stock = stock - reserved`; `Reserve stock` step; `Commit reservation → actual stock decrement (on delivery)` |

**Conclusion:** Reservation pattern is partially implemented in `inventory_locations` but lives only as imperative RPC steps — **no event row is written**.

### 3.2 TypeScript — Read & admin-write paths
- `src/lib/sovereignCatalog.ts` → `upsertSkuStock(skuId, stock)` — overwrites `availability_data.stock` JSON (admin Inventory page)
- `src/pages/admin/Inventory.tsx` — admin grid, calls `upsertSkuStock`
- `src/pages/admin/InventoryLocations.tsx` — read-only grid over `inventory_locations`
- `src/pages/admin/LowStock.tsx` — reads via `listLowStockProductsFn`
- `src/core-os/hakim-ai/hooks/useSovereignCheckout.ts` — orchestrates checkout, "decrements the inventory matrix"
- `src/apps/reef-al-madina/features/cart/hooks/useCartOrchestrator.ts` — invokes Matrix decrement + fulfillment fan-out
- `src/core/dna/projectors/projectProductDNA.ts` — reads `stock_qty` into `ProductSupplyDNA.on_hand` (already DNA-aware ✅)

---

## 4. Gap Analysis vs Constitution v2.0

| Article | Required | Today | Gap |
|---|---|---|---|
| **7.1** Append-Only `StockLedgerEvent` | Every quantity change = immutable row `{event_type, sku_id, location_id, delta, reason, actor, idempotency_key, occurred_at}` | Direct `UPDATE stock_qty - qty` | **MISSING — must build** |
| **12.x** `InventoryLocation` (multi-location truth) | `(sku_id, location_id) → on_hand, reserved, incoming` derived from ledger | `inventory_locations` exists but mutated in place | **PARTIAL — needs ledger projection** |
| **12.x** `InventoryReservation` lifecycle | Separate row with TTL: `pending → committed/released/expired` | Single integer `reserved` column | **MISSING — must build** |
| **5.x** Domain purity (`CivilizationEntity<InventoryDNA>`) | Layer-4 typed model | Only `ProductSupplyDNA` exists in `src/core/dna/types.ts` | **MISSING — must add types** |
| Idempotency | `idempotency_key` on every mutation | None on stock paths (exists on `ledger_entries` for wallet only) | **MISSING** |
| Time travel / audit | Reconstruct stock at any `t` | Impossible (overwrites) | **MISSING** |

---

## 5. Migration Strategy — "Wrap, Don't Replace"

### Phase 1A — Establish the Ledger (additive, zero break)
1. **Create** `inventory_ledger_events` (append-only, RLS, idempotency_key UNIQUE).
2. **Create** `inventory_reservations` (with `expires_at`, `state` enum).
3. **Add** `InventoryDNA` + `StockLedgerEvent` types to `src/core/dna/types.ts`.
4. **Build** `projectInventoryStateFn` server-fn → folds ledger events into a `CivilizationEntity<InventoryDNA>` per `(sku_id, location_id)`.
5. **DO NOT** stop writing to `usa_products.stock_qty` or `inventory_locations.stock`. They become **cached projections**.

### Phase 1B — Dual-Write Bridge
6. Wrap existing checkout RPCs with a **trigger** that emits a `sale` ledger event mirroring the `UPDATE` (no behavior change, just observability).
7. Wrap `upsertSkuStock` / admin edits to emit an `adjustment` event with `actor = auth.uid()`.

### Phase 1C — Reservation Cutover
8. New checkouts call `reserveStockFn` (writes `reservation` event + row) instead of touching `inventory_locations.reserved` directly.
9. Order confirmation calls `commitReservationFn` (emits `sale` event, releases reservation).
10. Background job expires stale `pending` reservations → emits `release` event.

### Phase 1D — Truth Inversion (later, gated)
11. Once ledger has 100% coverage, flip `inventory_locations` to a **materialized view** rebuilt from ledger.
12. Deprecate `usa_products.stock_qty` (keep column, mark `@deprecated`, project from ledger).

### What we will NOT touch in Phase 1A
- ❌ `usa_products` schema
- ❌ Existing checkout RPCs' behavior
- ❌ Storefront read paths
- ❌ Admin Inventory UI write contracts (`upsertSkuStock` keeps signature)

---

## 6. Open Questions (for the Emperor)

1. **Granularity of truth:** Should the canonical `(sku_id, location_id)` key use `salsabil_skus.id` (sovereign) or `usa_products.id` (legacy)? Recommendation: **dual-keyed** — ledger stores both, projector resolves.
2. **Reservation TTL default:** 15 min cart hold? 60 min checkout hold?
3. **Negative stock policy:** allow oversell with `backorder` event type, or hard reject at reservation time?
4. **Ledger retention:** infinite (true append-only) or rollup to monthly snapshots after N days?

---

## 7. Readiness Verdict

✅ Multi-location infrastructure present
✅ Reservation column exists (partial)
✅ DNA layer already models `ProductSupplyDNA`
✅ Admin tooling reads from all three systems gracefully
❌ No append-only ledger
❌ No reservation lifecycle
❌ No idempotency on stock writes
❌ No `InventoryDNA` Layer-4 type

**Status:** Ready to begin **Phase 1A (Ledger Foundation)** without breaking any existing checkout, cart, or admin flow.

---

*End of Reconnaissance. Awaiting the Emperor's command to begin Phase 1A — Inventory Ledger Foundation.*
