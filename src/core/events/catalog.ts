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
