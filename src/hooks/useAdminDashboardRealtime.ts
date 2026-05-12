// Realtime subscription for the admin Dashboard. Encapsulates the Supabase
// realtime channel so admin pages don't import the raw client directly.
import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useAdminDashboardRealtime(onChange: () => void) {
  const ref = useRef(onChange);
  ref.current = onChange;

  useEffect(() => {
    const channel = supabase
      .channel("admin-dashboard-master-orders")
      .on(
        "postgres_changes" as never,
        { event: "*", schema: "public", table: "salsabil_master_orders" },
        () => ref.current?.(),
      )
      .on(
        "postgres_changes" as never,
        { event: "*", schema: "public", table: "salsabil_fulfillment_nodes" },
        () => ref.current?.(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
}
