// Realtime subscription hook for the admin Master Orders hub.
// Encapsulates the Sovereign RealtimeGateway so admin pages don't import the
// raw client (Article 5 — Layered Architecture).
import { useEffect, useRef } from "react";
import { RealtimeGateway } from "@/core/events/gateway/RealtimeGateway";

type Options = {
  onInsert?: (id: string) => void;
  onChange?: () => void;
};

export function useAdminOrdersRealtime(opts: Options) {
  const optsRef = useRef(opts);
  optsRef.current = opts;

  useEffect(() => {
    const sub = RealtimeGateway.subscribeAdminOrders({
      onInsert: (id) => optsRef.current.onInsert?.(id),
      onChange: () => optsRef.current.onChange?.(),
    });
    return () => sub.unsubscribe();
  }, []);
}
