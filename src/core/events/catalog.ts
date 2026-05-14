/**
 * Salsabil OS — Sovereign Event Catalog.
 *
 * Single source of truth for every semantic event name emitted across
 * the OS. Domains MUST register their event keys here so Hakim, the
 * behavior writer, and downstream subscribers can discover the full
 * topology without spelunking individual emit sites.
 *
 * Implementation note: the runtime payload contracts live in
 * `./index.ts` (`SalsabilEvents`). This file only enumerates the
 * canonical keys and exposes a typed registry helper. No business
 * logic — pure metadata.
 */
import type { SalsabilEventName, SalsabilEvents } from "./index";

/** Frozen catalog of every well-known event name in the OS. */
export const EVENT_CATALOG = Object.freeze({
  PRODUCT_VIEWED: "product.viewed",
  SEARCH_PERFORMED: "search.performed",
  CATEGORY_ENTERED: "category.entered",
  CART_ABANDONED: "cart.abandoned",
  CART_ITEM_ADDED: "cart.item.added",
  CART_ITEM_REMOVED: "cart.item.removed",
  CART_ITEM_QTY_CHANGED: "cart.item.qty_changed",
  CART_CLEARED: "cart.cleared",
  CART_UPDATED: "cart.updated",
  ORDER_PLACED: "order.placed",
  LEDGER_TRANSACTION_APPENDED: "ledger.transaction.appended",
} as const);

export type EventCatalogKey = keyof typeof EVENT_CATALOG;

/** Compile-time guarantee: every catalog value is a known event name. */
type _CatalogIsValid = (typeof EVENT_CATALOG)[EventCatalogKey] extends SalsabilEventName
  ? true
  : never;
const _catalogCheck: _CatalogIsValid = true;
void _catalogCheck;

/** Enumerated list of every event name (stable order). */
export const EVENT_NAMES: ReadonlyArray<SalsabilEventName> = Object.freeze(
  Object.values(EVENT_CATALOG) as ReadonlyArray<SalsabilEventName>,
);

/** Typed payload accessor — useful for handler factories. */
export type EventPayload<E extends SalsabilEventName> = SalsabilEvents[E];

/**
 * Civilization Event — the canonical envelope for every semantic event
 * propagated through the Sovereign Event Cortex (Constitution Ch. 14.1).
 *
 * Append-only. Immutable. Trace-correlated. Schema-versioned.
 * Producers: gateways and server functions only.
 */
export interface CivilizationEvent<
  TName extends SalsabilEventName = SalsabilEventName,
  TPayload = EventPayload<TName>,
> {
  /** ULID — globally unique, time-sortable. */
  id: string;
  /** Dot-namespaced canonical name from EVENT_CATALOG. */
  name: TName;
  /** Monotonic schema version for the payload contract. */
  version: number;
  /** ISO 8601 UTC timestamp of occurrence. */
  occurred_at: string;
  /** Originating actor — user, system, or AI agent. */
  actor: { kind: "user" | "system" | "ai"; id: string };
  /** Workspace / tenant scope. */
  workspace_id: string;
  /** Correlates to the observability span (sovereign tracing). */
  trace_id: string;
  /** Optional causal pointer to the upstream event that triggered this one. */
  cause?: { kind: string; id: string };
  /** Schema-validated payload, typed by the event name. */
  payload: TPayload;
}
