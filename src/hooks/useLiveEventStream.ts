// Live admin event-timeline stream. Realtime channel is vended by
// RealtimeGateway; initial fetch flows through the sovereign server fn.
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { RealtimeGateway } from "@/core/events/gateway/RealtimeGateway";
import { listEventTimelineFn, type SovereignEventRow } from "@/core/system/sovereign.functions";

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

    const sub = RealtimeGateway.subscribeLiveEventStream<LiveTimelineEvent>({
      onInsert: (row) => setEvents((prev) => [row, ...prev].slice(0, limit)),
      onStatus: (subscribed) => setConnected(subscribed),
    });

    return () => {
      cancelled = true;
      sub.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit]);

  return { events, connected };
}
