/**
 * InventoryBrain — Layer 4/5 (Domain + Application/Transform)
 * Constitution v2.0 · Article 7.1 (Append-Only Ledger) · Article 8 (Backorder Policy) · Chapter 12 (Reservations)
 *
 * Pure, synchronous, side-effect-free. NO DB. NO I/O. NO Supabase.
 * The brain folds past events → state, and generates new immutable events.
 * It NEVER returns a mutable "update" instruction.
 */
import type {
  ISODateString,
  JsonObject,
} from "@/core/commerce/knowledge/dna.types";
import type {
  StockLedgerEvent,
  StockLedgerEventType,
} from "./types";

// ─────────────────────────────────────────────────────────────
// 1. State projection: fold(events) → InventoryStateSnapshot
// ─────────────────────────────────────────────────────────────

export interface InventoryStateSnapshot {
  on_hand: number;
  reserved: number;
  available: number;
}

/**
 * Signed contribution of each event type to the on-hand bucket.
 *  receive  : +delta (inbound)
 *  adjust   : +delta (signed; can be negative)
 *  commit   : +delta (commit deltas are persisted as negative)
 *  spoilage : +delta (persisted as negative)
 *  backorder: +delta (persisted as negative — accepted oversell)
 *  reserve / release : 0  (touch reserved bucket only)
 */
const ON_HAND_CONTRIBUTORS: ReadonlySet<StockLedgerEventType> = new Set([
  "receive",
  "adjust",
  "commit",
  "spoilage",
  "backorder",
]);

/**
 * Signed contribution to the reserved bucket.
 *  reserve : +|delta|   (hold)
 *  release : -|delta|   (free)
 *  commit  : -|delta|   (reservation realized → leaves reserved bucket)
 */
const RESERVED_CONTRIBUTORS: ReadonlySet<StockLedgerEventType> = new Set([
  "reserve",
  "release",
  "commit",
]);

export function calculateStock(events: ReadonlyArray<StockLedgerEvent>): InventoryStateSnapshot {
  let on_hand = 0;
  let reserved = 0;

  for (const e of events) {
    if (ON_HAND_CONTRIBUTORS.has(e.event_type)) {
      on_hand += e.delta;
    }
    if (RESERVED_CONTRIBUTORS.has(e.event_type)) {
      switch (e.event_type) {
        case "reserve":
          reserved += Math.abs(e.delta);
          break;
        case "release":
        case "commit":
          reserved -= Math.abs(e.delta);
          break;
      }
    }
  }

  // Reserved can never go negative in a well-formed ledger; clamp defensively.
  if (reserved < 0) reserved = 0;

  return {
    on_hand,
    reserved,
    available: on_hand - reserved,
  };
}

// ─────────────────────────────────────────────────────────────
// 2. Event factories — generate, never mutate
// ─────────────────────────────────────────────────────────────

interface EventFactoryArgs {
  entity_id: string;
  location_id: string;
  qty: number;            // always passed as a positive magnitude
  order_ref: string;
  idempotency_key: string;
  actor_id?: string | null;
  occurred_at?: ISODateString;
  context?: JsonObject;
}

/** Draft event — id is assigned at the persistence boundary, not here. */
export type DraftStockLedgerEvent = Omit<StockLedgerEvent, "id">;

function nowIso(): ISODateString {
  return new Date().toISOString();
}

function buildEvent(
  type: StockLedgerEventType,
  signedDelta: number,
  args: EventFactoryArgs,
): DraftStockLedgerEvent {
  return {
    entity_id: args.entity_id,
    location_id: args.location_id,
    event_type: type,
    delta: signedDelta,
    idempotency_key: args.idempotency_key,
    actor_id: args.actor_id ?? null,
    context: { order_ref: args.order_ref, ...(args.context ?? {}) },
    occurred_at: args.occurred_at ?? nowIso(),
  };
}

/** Generates a `reserve` event (stored as negative delta — magnitude held). */
export function createReservationEvent(
  entity_id: string,
  location_id: string,
  qty: number,
  order_ref: string,
  idempotency_key: string,
  extras: { actor_id?: string | null; context?: JsonObject; occurred_at?: ISODateString } = {},
): DraftStockLedgerEvent {
  const magnitude = Math.abs(qty);
  return buildEvent("reserve", -magnitude, {
    entity_id,
    location_id,
    qty: magnitude,
    order_ref,
    idempotency_key,
    ...extras,
  });
}

/** Generates a `release` event — cancels/expires a hold, returns qty to available. */
export function releaseReservationEvent(
  entity_id: string,
  location_id: string,
  qty: number,
  order_ref: string,
  idempotency_key: string,
  extras: { actor_id?: string | null; context?: JsonObject; occurred_at?: ISODateString } = {},
): DraftStockLedgerEvent {
  const magnitude = Math.abs(qty);
  return buildEvent("release", magnitude, {
    entity_id,
    location_id,
    qty: magnitude,
    order_ref,
    idempotency_key,
    ...extras,
  });
}

/** Generates a `commit` event — realized sale, decrements on-hand, releases hold. */
export function commitReservationEvent(
  entity_id: string,
  location_id: string,
  qty: number,
  order_ref: string,
  idempotency_key: string,
  extras: { actor_id?: string | null; context?: JsonObject; occurred_at?: ISODateString } = {},
): DraftStockLedgerEvent {
  const magnitude = Math.abs(qty);
  return buildEvent("commit", -magnitude, {
    entity_id,
    location_id,
    qty: magnitude,
    order_ref,
    idempotency_key,
    ...extras,
  });
}

// ─────────────────────────────────────────────────────────────
// 3. Constitutional guard — Article 8 (oversell policy)
// ─────────────────────────────────────────────────────────────

/**
 * Pure rule: a reservation is admissible iff requested ≤ available,
 * unless the SKU/entity has explicit backorder capability.
 */
export function canReserve(
  requestedQty: number,
  availableQty: number,
  hasBackorderCapability: boolean,
): boolean {
  if (!Number.isFinite(requestedQty) || requestedQty <= 0) return false;
  if (requestedQty <= availableQty) return true;
  return hasBackorderCapability === true;
}
