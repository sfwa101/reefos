// Realtime subscription for admin_override_logs (insert-only feed).
import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { OverrideLogRow } from "@/lib/profit-observation.functions";

export function useAdminOverrideLogsRealtime(onInsert: (row: OverrideLogRow) => void) {
  const ref = useRef(onInsert);
  ref.current = onInsert;

  useEffect(() => {
    const channel = supabase
      .channel("admin_override_logs-feed")
      .on(
        "postgres_changes" as never,
        { event: "INSERT", schema: "public", table: "admin_override_logs" },
        (payload: { new?: OverrideLogRow }) => {
          if (payload?.new) ref.current?.(payload.new);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
}
