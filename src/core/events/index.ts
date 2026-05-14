/**
 * Salsabil OS — Central Event Bus (Phase VII-A)
 *
 * Push-based behavior fabric. All apps (reef, khalil, asrab, nabd) emit
 * semantic events here. Hakim AI and the behavioral memory writer subscribe.
 *
 * Why mitt: 200 bytes, zero deps, sync emit, stable subscribe/unsubscribe
 * references — safe to use in React effect deps.
 */
import mitt, { type Handler } from "mitt";
import { useEffect } from "react";

export type SalsabilAppId = "reef" | "khalil" | "asrab" | "nabd";

export type SalsabilEvents = {
  "product.viewed": {
    productId: string;
    category?: string;
    appId?: SalsabilAppId;
  };
  "search.performed": {
    query: string;
    resultCount: number;
    appId?: SalsabilAppId;
  };
  "category.entered": {
    categoryId: string;
    categoryName?: string;
    appId?: SalsabilAppId;
  };
  "cart.abandoned": {
    items: number;
    totalQuantity: number;
    idleMinutes: number;
    appId?: SalsabilAppId;
  };
  "cart.item.added": {
    lineId: string;
    productId: string;
    qty: number;
    appId?: SalsabilAppId;
  };
  "cart.item.removed": {
    lineId: string;
    productId: string;
    appId?: SalsabilAppId;
  };
  "cart.item.qty_changed": {
    lineId: string;
    productId: string;
    qty: number;
    previousQty: number;
    appId?: SalsabilAppId;
  };
  "cart.cleared": {
    itemCount: number;
    appId?: SalsabilAppId;
  };
  "cart.updated": {
    itemCount: number;
    grandTotal: number;
    currency: string;
    snapshotHash: string;
    appId?: SalsabilAppId;
  };
  "order.placed": {
    orderId: string;
    idempotencyKey: string;
    grandTotal: number;
    currency: string;
    itemCount: number;
    paymentMethod: string;
    snapshotHash: string;
    lines: ReadonlyArray<{
      lineId: string;
      productId: string;
      name?: string;
      qty: number;
      capabilities: ReadonlyArray<string>;
    }>;
    appId?: SalsabilAppId;
  };
  "kds.ticket.created": {
    ticketId: string;
    orderId: string;
    lineCount: number;
    appId?: SalsabilAppId;
  };
  "kds.ticket.updated": {
    ticketId: string;
    orderId: string;
    previousStatus: "queued" | "preparing" | "ready" | "delivered";
    status: "queued" | "preparing" | "ready" | "delivered";
    appId?: SalsabilAppId;
  };
  "ledger.transaction.appended": {
    transactionId: string;
    idempotencyKey: string;
    orderId: string;
    amount: number;
    currency: string;
    direction: "debit" | "credit";
    account: string;
    appId?: SalsabilAppId;
  };
};

export type SalsabilEventName = keyof SalsabilEvents;

export const eventBus = mitt<SalsabilEvents>();

/** Subscribe a stable handler to an event for the lifetime of a component. */
export function useEventSubscribe<E extends SalsabilEventName>(
  event: E,
  handler: Handler<SalsabilEvents[E]>,
): void {
  useEffect(() => {
    eventBus.on(event, handler);
    return () => {
      eventBus.off(event, handler);
    };
  }, [event, handler]);
}

/** Convenience emitter — preserves type-safety on the payload. */
export function emitSalsabilEvent<E extends SalsabilEventName>(
  event: E,
  payload: SalsabilEvents[E],
): void {
  eventBus.emit(event, payload);
}
