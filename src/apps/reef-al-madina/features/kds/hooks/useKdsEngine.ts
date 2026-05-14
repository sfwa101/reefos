/**
 * useKdsEngine — Phase 55. Wave P-3 Sub-Wave 11: Supabase access (incl.
 * realtime) routed through KdsGateway.
 *
 * Live feed of kitchen-bound fulfillment nodes. Loads pending/preparing
 * nodes with their items + SKU names, then subscribes via
 * `useVisibilitySocket` (Phase 44 governance) to react to inserts/updates
 * without burning an idle socket when the tab is hidden.
 */
import { useCallback, useEffect, useState } from "react";
import { KdsGateway } from "@/core/kds/gateway/KdsGateway";
import { useVisibilitySocket } from "@/core/events/hooks/useVisibilitySocket";
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
  const list = await KdsGateway.fetchActiveNodes(ACTIVE_NODE_STATUSES);
  if (list.length === 0) return [];

  const ids = list.map((n) => n.id);
  const items = await KdsGateway.fetchItemsForNodes(ids);

  const itemsByNode = new Map<string, KdsItem[]>();
  for (const raw of items) {
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
      const channel = KdsGateway.subscribeFulfillmentNodes(() => {
        refresh();
      });
      return () => { channel.unsubscribe(); };
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
      const cur = await KdsGateway.fetchNodeSnapshot(nodeId);
      const snapshot = (cur?.delivery_snapshot ?? {}) as Record<string, unknown>;
      const merged = { ...snapshot, prep_meta };

      const updates: { delivery_snapshot: Record<string, unknown>; status?: string } = {
        delivery_snapshot: merged,
      };
      if (next === "ready") updates.status = "ready_for_pickup";

      await KdsGateway.updateNodeSnapshot(nodeId, updates);

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
