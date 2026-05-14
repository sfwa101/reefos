/**
 * KdsGateway — Sovereign boundary for the Kitchen Display System feed.
 * Wave P-3 Sub-Wave 11.
 *
 * Constitutional contract:
 *   • Only place permitted to read/write `salsabil_fulfillment_nodes` and
 *     to subscribe to its realtime channel from UI-bound KDS code paths.
 *   • Vends realtime subscriptions as `GatewayChannel` (unsubscribe handle).
 *
 * Wave P-13: snapshot updates use `as never` on the JSONB payload to satisfy
 * the conservative generated row typing for JSONB writes (no `any`).
 */
import { supabase } from "@/integrations/supabase/client";

export type GatewayChannel = { unsubscribe: () => void };

export type KdsNodeRow = {
  id: string;
  master_order_id: string | null;
  status: string;
  total_amount: number;
  notes: string | null;
  created_at: string;
  delivery_snapshot: unknown;
};

export type KdsItemRow = {
  id: string;
  node_id: string;
  sku_id: string;
  quantity: number;
  salsabil_skus: { name_ar?: string | null; sku_code?: string | null } | null;
};

const fetchActiveNodes = async (
  activeStatuses: string[],
): Promise<KdsNodeRow[]> => {
  const { data, error } = await supabase
    .from("salsabil_fulfillment_nodes")
    .select("id, master_order_id, status, total_amount, notes, created_at, delivery_snapshot")
    .in("status", activeStatuses)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as KdsNodeRow[];
};

const fetchItemsForNodes = async (nodeIds: string[]): Promise<KdsItemRow[]> => {
  if (nodeIds.length === 0) return [];
  const { data } = await supabase
    .from("salsabil_fulfillment_items")
    .select("id, node_id, sku_id, quantity, salsabil_skus(name_ar, sku_code)")
    .in("node_id", nodeIds);
  return (data ?? []) as unknown as KdsItemRow[];
};

const fetchNodeSnapshot = async (
  nodeId: string,
): Promise<{ delivery_snapshot: unknown; status: string | null } | null> => {
  const { data } = await supabase
    .from("salsabil_fulfillment_nodes")
    .select("delivery_snapshot, status")
    .eq("id", nodeId)
    .maybeSingle();
  return (data ?? null) as { delivery_snapshot: unknown; status: string | null } | null;
};

const updateNodeSnapshot = async (
  nodeId: string,
  updates: { delivery_snapshot: Record<string, unknown>; status?: string },
): Promise<void> => {
  const { error } = await supabase
    .from("salsabil_fulfillment_nodes")
    .update(updates as never)
    .eq("id", nodeId);
  if (error) throw error;
};

const subscribeFulfillmentNodes = (onChange: () => void): GatewayChannel => {
  const channel = supabase
    .channel("kds-fulfillment-nodes")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "salsabil_fulfillment_nodes" },
      () => onChange(),
    )
    .subscribe();
  return {
    unsubscribe: () => {
      void supabase.removeChannel(channel);
    },
  };
};

export const KdsGateway = {
  fetchActiveNodes,
  fetchItemsForNodes,
  fetchNodeSnapshot,
  updateNodeSnapshot,
  subscribeFulfillmentNodes,
};
