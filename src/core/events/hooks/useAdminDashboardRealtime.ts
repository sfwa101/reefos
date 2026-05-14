// Realtime subscription for the admin Dashboard. Encapsulates the Sovereign
// RealtimeGateway so admin pages don't import the raw client directly.
import { useEffect, useRef } from "react";
import { RealtimeGateway } from "@/core/events/gateway/RealtimeGateway";

export function useAdminDashboardRealtime(onChange: () => void) {
  const ref = useRef(onChange);
  ref.current = onChange;

  useEffect(() => {
    const sub = RealtimeGateway.subscribeAdminDashboard(() => ref.current?.());
    return () => sub.unsubscribe();
  }, []);
}
