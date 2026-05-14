/**
 * RealtimeGateway — Sovereign Realtime / Postgres-changes boundary
 * (Wave P-3 Sub-Wave 3).
 *
 * Constitutional contract (CONSTITUTION_AI_GOVERNANCE §5 + SUPABASE_SOVEREIGNTY §2/§3):
 *   • Only place permitted to call `supabase.channel(...).on(...).subscribe()`
 *     for the events / admin-orders / admin-dashboard / override-logs / live
 *     event-stream domains.
 *   • Hooks consume typed callbacks and receive a `GatewayChannel` handle
 *     (or a plain unsubscribe function) — they never touch the Supabase
 *     client directly.
 */
import { supabase } from "@/integrations/supabase/client";

export type GatewayChannel = { unsubscribe: () => void };

/* ────────────────────────────────────────────────────────────────────────── *
 *  Admin — Master Orders list                                               *
 * ────────────────────────────────────────────────────────────────────────── */

export type AdminOrdersHandlers = {
  onInsert?: (id: string) => void;
  onChange?: () => void;
};

const subscribeAdminOrders = (
  handlers: AdminOrdersHandlers,
): GatewayChannel => {
  const channel = supabase
    .channel("admin-master-orders-list")
    .on(
      "postgres_changes" as never,
      { event: "INSERT", schema: "public", table: "salsabil_master_orders" },
      (payload: { new?: { id?: string } }) => {
        const id = payload?.new?.id;
        if (id) handlers.onInsert?.(id);
        handlers.onChange?.();
      },
    )
    .on(
      "postgres_changes" as never,
      { event: "UPDATE", schema: "public", table: "salsabil_master_orders" },
      () => handlers.onChange?.(),
    )
    .on(
      "postgres_changes" as never,
      { event: "*", schema: "public", table: "salsabil_fulfillment_nodes" },
      () => handlers.onChange?.(),
    )
    .subscribe();
  return { unsubscribe: () => { void supabase.removeChannel(channel); } };
};

/* ────────────────────────────────────────────────────────────────────────── *
 *  Admin — Dashboard (master orders + fulfillment nodes)                    *
 * ────────────────────────────────────────────────────────────────────────── */

const subscribeAdminDashboard = (onChange: () => void): GatewayChannel => {
  const channel = supabase
    .channel("admin-dashboard-master-orders")
    .on(
      "postgres_changes" as never,
      { event: "*", schema: "public", table: "salsabil_master_orders" },
      () => onChange(),
    )
    .on(
      "postgres_changes" as never,
      { event: "*", schema: "public", table: "salsabil_fulfillment_nodes" },
      () => onChange(),
    )
    .subscribe();
  return { unsubscribe: () => { void supabase.removeChannel(channel); } };
};

/* ────────────────────────────────────────────────────────────────────────── *
 *  Admin — Override logs (insert-only feed)                                 *
 * ────────────────────────────────────────────────────────────────────────── */

const subscribeAdminOverrideLogs = <TRow>(
  onInsert: (row: TRow) => void,
): GatewayChannel => {
  const channel = supabase
    .channel("admin_override_logs-feed")
    .on(
      "postgres_changes" as never,
      { event: "INSERT", schema: "public", table: "admin_override_logs" },
      (payload: { new?: TRow }) => {
        if (payload?.new) onInsert(payload.new);
      },
    )
    .subscribe();
  return { unsubscribe: () => { void supabase.removeChannel(channel); } };
};

/* ────────────────────────────────────────────────────────────────────────── *
 *  Live event timeline (admin event stream)                                 *
 * ────────────────────────────────────────────────────────────────────────── */

export type LiveEventStreamHandlers<TRow> = {
  onInsert: (row: TRow) => void;
  onStatus?: (subscribed: boolean) => void;
};

const subscribeLiveEventStream = <TRow>(
  handlers: LiveEventStreamHandlers<TRow>,
): GatewayChannel => {
  const channel = supabase
    .channel("admin-event-stream")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "salsabil_event_timeline" },
      (payload) => handlers.onInsert(payload.new as TRow),
    )
    .subscribe((status) => handlers.onStatus?.(status === "SUBSCRIBED"));
  return { unsubscribe: () => { void supabase.removeChannel(channel); } };
};

export const RealtimeGateway = {
  subscribeAdminOrders,
  subscribeAdminDashboard,
  subscribeAdminOverrideLogs,
  subscribeLiveEventStream,
};
