/**
 * useKdsEngine — Phase 55.
 *
 * Live feed of kitchen-bound fulfillment nodes. Loads pending/preparing nodes
 * with their items + SKU names, then subscribes via `useVisibilitySocket`
 * (Phase 44 governance) to react to inserts/updates without burning an idle
 * socket when the tab is hidden.
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useVisibilitySocket } from "@/hooks/useVisibilitySocket";
import { readPrepMeta, type PrepMeta, type PrepStatus } from "../types";

export interface KdsItem {
  id: string;
  sku_id: string;
  quantity: number;
  sku_name: string | null;
}

export interface KdsTicket {
  id: string;                       // node_id
  master_order_id: string | null;
  status: string;
  total_amount: number;
  notes: string | null;
  created_at: string;
  prep: PrepMeta;
  items: KdsItem[];
}

const ACTIVE_NODE_STATUSES = ["pending", "assigned", "preparing", "ready_for_pickup"];

const fetchTickets = async (): Promise<KdsTicket[]> => {
  // 1. Load active nodes
  const { data: nodes, error } = await supabase
    .from("salsabil_fulfillment_nodes")
    .select("id, master_order_id, status, total_amount, notes, created_at, delivery_snapshot")
    .in("status", ACTIVE_NODE_STATUSES)
    .order("created_at", { ascending: true });
  if (error) throw error;
  const list = (nodes ?? []) as Array<{
    id: string;
    master_order_id: string | null;
    status: string;
    total_amount: number;
    notes: string | null;
    created_at: string;
    delivery_snapshot: unknown;
  }>;
  if (list.length === 0) return [];

  // 2. Load items for those nodes (+ sku names)
  const ids = list.map((n) => n.id);
  const { data: items } = await supabase
    .from("salsabil_fulfillment_items")
    .select("id, node_id, sku_id, quantity, salsabil_skus(name_ar, sku_code)")
    .in("node_id", ids);

  const itemsByNode = new Map<string, KdsItem[]>();
  for (const raw of (items ?? []) as Array<{
    id: string;
    node_id: string;
    sku_id: string;
    quantity: number;
    salsabil_skus: { name_ar?: string | null; sku_code?: string | null } | null;
  }>) {
    const arr = itemsByNode.get(raw.node_id) ?? [];
    arr.push({
      id: raw.id,
      sku_id: raw.sku_id,
      quantity: raw.quantity,
      sku_name: raw.salsabil_skus?.name_ar ?? raw.salsabil_skus?.sku_code ?? null,
    });
    itemsByNode.set(raw.node_id, arr);
  }

  return list.map((n) => ({
    id: n.id,
    master_order_id: n.master_order_id,
    status: n.status,
    total_amount: Number(n.total_amount ?? 0),
    notes: n.notes,
    created_at: n.created_at,
    prep: readPrepMeta(n.delivery_snapshot),
    items: itemsByNode.get(n.id) ?? [],
  }));
};

export const useKdsEngine = () => {
  const [tickets, setTickets] = useState<KdsTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const next = await fetchTickets();
      setTickets(next);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذّر تحميل التذاكر");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Realtime — visibility-governed
  useVisibilitySocket(
    () => {
      const channel = supabase
        .channel("kds-fulfillment-nodes")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "salsabil_fulfillment_nodes" },
          () => { refresh(); },
        )
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    },
    () => { refresh(); },
    [refresh],
  );

  const setPrepStatus = useCallback(
    async (nodeId: string, next: PrepStatus) => {
      const ticket = tickets.find((t) => t.id === nodeId);
      const now = new Date().toISOString();
      const prevPrep = ticket?.prep ?? readPrepMeta({});
      const prep_meta: PrepMeta = {
        ...prevPrep,
        status: next,
        started_at: next === "preparing" ? (prevPrep.started_at ?? now) : prevPrep.started_at,
        completed_at: next === "ready" ? now : prevPrep.completed_at,
      };

      // Read-modify-write the JSONB snapshot to preserve other keys.
      const { data: cur } = await supabase
        .from("salsabil_fulfillment_nodes")
        .select("delivery_snapshot, status")
        .eq("id", nodeId)
        .maybeSingle();
      const snapshot = (cur?.delivery_snapshot ?? {}) as Record<string, unknown>;
      const merged = { ...snapshot, prep_meta };

      const updates: { delivery_snapshot: Record<string, unknown>; status?: string } = {
        delivery_snapshot: merged,
      };
      if (next === "ready") updates.status = "ready_for_pickup";

      const { error: upErr } = await supabase
        .from("salsabil_fulfillment_nodes")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .update(updates as any)
        .eq("id", nodeId);
      if (upErr) throw upErr;

      // Optimistic local update; realtime will reconcile.
      setTickets((cur) =>
        cur.map((t) =>
          t.id === nodeId
            ? { ...t, prep: prep_meta, status: next === "ready" ? "ready_for_pickup" : t.status }
            : t,
        ),
      );
    },
    [tickets],
  );

  return { tickets, loading, error, refresh, setPrepStatus };
};
