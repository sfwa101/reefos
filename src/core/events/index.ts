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
