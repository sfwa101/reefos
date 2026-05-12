// Realtime subscription hook for the admin Master Orders hub.
// Encapsulates the browser-side Supabase realtime channel so admin pages
// don't import the raw client (Article 5 — Layered Architecture).
import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

type Options = {
  onInsert?: (id: string) => void;
  onChange?: () => void;
};

export function useAdminOrdersRealtime(opts: Options) {
  const optsRef = useRef(opts);
  optsRef.current = opts;

  useEffect(() => {
    const channel = supabase
      .channel("admin-master-orders-list")
      .on(
        "postgres_changes" as never,
        { event: "INSERT", schema: "public", table: "salsabil_master_orders" },
        (payload: { new?: { id?: string } }) => {
          const id = payload?.new?.id;
          if (id) optsRef.current.onInsert?.(id);
          optsRef.current.onChange?.();
        },
      )
      .on(
        "postgres_changes" as never,
        { event: "UPDATE", schema: "public", table: "salsabil_master_orders" },
        () => optsRef.current.onChange?.(),
      )
      .on(
        "postgres_changes" as never,
        { event: "*", schema: "public", table: "salsabil_fulfillment_nodes" },
        () => optsRef.current.onChange?.(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
}
