/**
 * useTrackBehavior — global behavior writer.
 *
 * Mount once near the OS root (under AuthProvider). Subscribes to the
 * Salsabil Event Bus and persists each event to `user_behavior_events`
 * (RLS-scoped to the signed-in user). Anonymous sessions are ignored —
 * we never write null user_id rows.
 *
 * Writes are fire-and-forget; failures never break the host app.
 */
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import {
  eventBus,
  type SalsabilEventName,
  type SalsabilEvents,
} from "./index";

const TRACKED_EVENTS: SalsabilEventName[] = [
  "product.viewed",
  "search.performed",
  "category.entered",
  "cart.abandoned",
];

export function useTrackBehavior(): void {
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) return;
    const userId = user.id;

    const makeHandler = <E extends SalsabilEventName>(eventType: E) => {
      return (payload: SalsabilEvents[E]) => {
        const appId = (payload as { appId?: string }).appId ?? "reef";
        void supabase
          .from("user_behavior_events")
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .insert({
            user_id: userId,
            event_type: eventType,
            app_id: appId,
            payload: payload as unknown as Record<string, unknown>,
          } as any)
          .then(() => undefined, () => undefined);
      };
    };

    const handlers = TRACKED_EVENTS.map((evt) => {
      const h = makeHandler(evt);
      eventBus.on(evt, h as Parameters<typeof eventBus.on>[1]);
      return [evt, h] as const;
    });

    return () => {
      for (const [evt, h] of handlers) {
        eventBus.off(evt, h as Parameters<typeof eventBus.off>[1]);
      }
    };
  }, [user?.id]);
}
