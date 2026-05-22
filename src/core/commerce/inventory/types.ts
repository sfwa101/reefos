/**
 * Inventory Domain Types — Layer 4
 * Constitution v2.0 · Article 7.1 (Append-Only Stock Ledger) · Chapter 12 (Reservations)
 *
 * Pure domain models. No DB, no I/O. The ledger is the source of truth;
 * `inventory_locations` and `salsabil_skus.stock_qty` become cached projections.
 */
import type { ISODateString, JsonObject } from "@/core/commerce/knowledge/dna.types";

/** Every legal mutation that can ever change on-hand or reserved stock. */
export type StockLedgerEventType =
  | "receive"   // inbound: PO, transfer-in, return-to-stock
  | "reserve"   // soft hold for a cart/order (decrements available)
  | "commit"    // reservation → realized sale (decrements on-hand)
  | "release"   // reservation cancelled/expired (restores available)
  | "adjust"    // manual admin correction (audit trail required)
  | "spoilage"  // perishable loss / breakage / waste
  | "backorder"; // accepted oversell (negative on-hand allowed)

/** Reservation lifecycle. Terminal states: committed, released, expired. */
export type ReservationState = "pending" | "committed" | "released" | "expired";

/**
 * The atom of inventory truth. Append-only, never updated, never deleted.
 * `delta` is signed: receive/release > 0; reserve/commit/spoilage < 0; adjust either.
 */
export interface StockLedgerEvent {
  id: string;
  entity_id: string;       // product_id or sku_id (dual-keyed; resolver picks)
  location_id: string;     // warehouse_id / store_id
  event_type: StockLedgerEventType;
  delta: number;
  idempotency_key: string; // UNIQUE — replay-safe writes
  actor_id: string | null; // auth.uid() when applicable
  context: JsonObject;     // { order_id?, reservation_id?, reason?, source? }
  occurred_at: ISODateString;
}

export interface ReservationItem {
  entity_id: string;
  location_id: string;
  qty: number;
}

/**
 * A grouped soft-hold over N items, with TTL.
 * One reservation row → many `reserve`/`release`/`commit` ledger events.
 */
export interface InventoryReservation {
  id: string;
  order_ref: string;       // cart_id / draft_order_id / checkout_session_id
  state: ReservationState;
  expires_at: ISODateString;
  created_at: ISODateString;
  items: ReservationItem[];
}
