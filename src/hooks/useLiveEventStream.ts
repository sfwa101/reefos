// @constitutional-exemption: Article 5 — realtime subscription requires the
// browser Supabase client. Encapsulated here so admin UI components stay
// pure presentation. Initial fetch flows through the sovereign gateway.
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { listEventTimelineFn, type SovereignEventRow } from "@/lib/sovereign.functions";

export type LiveTimelineEvent = SovereignEventRow;

export function useLiveEventStream(limit: number = 20) {
  const [events, setEvents] = useState<LiveTimelineEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const fetchTimeline = useServerFn(listEventTimelineFn);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await fetchTimeline({ data: { page: 0 } });
        if (!cancelled) setEvents((rows ?? []).slice(0, limit));
      } catch {
        /* swallow — stream will catch up */
      }
    })();

    const channel = supabase
      .channel("admin-event-stream")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "salsabil_event_timeline" },
        (payload) => {
          const row = payload.new as LiveTimelineEvent;
          setEvents((prev) => [row, ...prev].slice(0, limit));
        },
      )
      .subscribe((status) => setConnected(status === "SUBSCRIBED"));

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit]);

  return { events, connected };
}
