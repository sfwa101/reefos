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
import type { Handler } from "mitt";
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

type TrackedPayload = SalsabilEvents[SalsabilEventName];

export function useTrackBehavior(): void {
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) return;
    const userId = user.id;

    const makeHandler = (eventType: SalsabilEventName): Handler<TrackedPayload> => {
      return (payload) => {
        const appId = (payload as { appId?: string })?.appId ?? "reef";
        void (supabase
          .from("user_behavior_events") as unknown as {
            insert: (row: Record<string, unknown>) => Promise<unknown>;
          })
          .insert({
            user_id: userId,
            event_type: eventType,
            app_id: appId,
            payload: payload as Record<string, unknown>,
          })
          .then(() => undefined, () => undefined);
      };
    };

    const handlers: Array<readonly [SalsabilEventName, Handler<TrackedPayload>]> =
      TRACKED_EVENTS.map((evt) => {
        const h = makeHandler(evt);
        // mitt's `on()` requires a Handler typed against the specific event payload;
        // our wildcard handler accepts the union, so narrow at the call site only.
        eventBus.on(evt, h as Handler<SalsabilEvents[typeof evt]>);
        return [evt, h] as const;
      });

    return () => {
      for (const [evt, h] of handlers) {
        eventBus.off(evt, h as Handler<SalsabilEvents[typeof evt]>);
      }
    };
  }, [user?.id]);
}
