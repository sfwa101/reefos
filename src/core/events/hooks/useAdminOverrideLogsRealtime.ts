// Realtime subscription for admin_override_logs (insert-only feed).
import { useEffect, useRef } from "react";
import { RealtimeGateway } from "@/core/events/gateway/RealtimeGateway";
import type { OverrideLogRow } from "@/core/finance/profit-observation.functions";

export function useAdminOverrideLogsRealtime(onInsert: (row: OverrideLogRow) => void) {
  const ref = useRef(onInsert);
  ref.current = onInsert;

  useEffect(() => {
    const sub = RealtimeGateway.subscribeAdminOverrideLogs<OverrideLogRow>((row) => {
      ref.current?.(row);
    });
    return () => sub.unsubscribe();
  }, []);
}
