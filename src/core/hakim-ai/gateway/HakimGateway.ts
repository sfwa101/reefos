/**
 * HakimGateway — sovereign boundary for the Hakim AI domain.
 *
 * Wraps direct Supabase access (RPCs, edge function invocations, realtime,
 * and table reads/writes) used by Hakim hooks and surfaces. All Hakim hooks
 * must call this gateway instead of importing the Supabase client.
 *
 * Pre-existing `any` casts preserved (Wave P-7 will harden types).
 */
import { supabase } from "@/integrations/supabase/client";

export type GatewayChannel = { unsubscribe: () => void };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabase as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rpc = (supabase.rpc as any).bind(supabase);

export const HakimGateway = {
  // ============= Edge function invocations =============

  async invokeHakimPulse(body: { page: string; tiles: unknown[] }) {
    return await supabase.functions.invoke("hakim-pulse", { body });
  },

  async invokeGenerateEmbedding(text: string) {
    return await supabase.functions.invoke("generate_embedding", { body: { text } });
  },

  async invokePredictBasket() {
    return await supabase.functions.invoke("predict_basket", { body: {} });
  },

  async invokeProcessImageAesthetic(body: {
    image_base64: string;
    mime_type: string;
    style: string;
    palette_name: string | null;
    palette_hex: string | null;
  }) {
    return await supabase.functions.invoke("process_image_aesthetic", { body });
  },

  async getAccessTokenForChat(): Promise<string | null> {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  },

  // ============= Anomalies (table + realtime) =============

  async listAnomalies(limit: number) {
    const { data } = await sb
      .from("hakim_anomalies")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    return data ?? [];
  },

  subscribeAnomalies(onChange: () => void): GatewayChannel {
    const channel = sb
      .channel("hakim_anomalies_feed")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "hakim_anomalies" },
        () => onChange(),
      )
      .subscribe();
    return { unsubscribe: () => sb.removeChannel(channel) };
  },

  async getPulseStats(minutes: number) {
    const { data } = await rpc("hakim_pulse_stats", { _minutes: minutes });
    return data;
  },

  async resolveAnomaly(id: string) {
    const { error } = await rpc("resolve_anomaly", { _id: id });
    return { error };
  },

  async reportAnomaly(input: {
    type: string;
    severity: "info" | "warning" | "error" | "critical";
    description: string;
    payload: Record<string, unknown>;
    source: string;
    fingerprint: string | null;
  }) {
    try {
      await rpc("report_anomaly", {
        _type: input.type,
        _severity: input.severity,
        _description: input.description.slice(0, 500),
        _payload: input.payload,
        _source: input.source,
        _fingerprint: input.fingerprint,
      });
    } catch {
      /* swallow — telemetry must never break host */
    }
  },

  // ============= USA / Catalog RPCs =============

  async updateUniversalAsset(input: {
    asset_id: string;
    name: string;
    description: string | null;
    base_price: number | null;
  }) {
    const { data, error } = await rpc("update_universal_asset", {
      p_asset_id: input.asset_id,
      p_name: input.name,
      p_description: input.description,
      p_base_price: input.base_price,
    });
    return { data, error };
  },

  async mintUniversalAsset(payload: unknown) {
    const { data, error } = await rpc("mint_universal_asset", { payload });
    return { data, error };
  },

  async matchUniversalAsset(embedding: number[], threshold: number) {
    const { data, error } = await rpc("match_universal_asset", {
      p_embedding: embedding,
      p_threshold: threshold,
    });
    return { data, error };
  },

  // ============= Inventory matrix =============

  async listInventoryMatrix(skuId: string) {
    const { data, error } = await supabase
      .from("salsabil_inventory_matrix")
      .select("*")
      .eq("sku_id", skuId)
      .order("updated_at", { ascending: false });
    return { data: data ?? [], error };
  },

  async upsertInventoryMatrix(input: {
    sku_id: string;
    location_id: string;
    inventory_type: string;
    availability: Record<string, unknown>;
  }) {
    const { data, error } = await rpc("upsert_inventory_matrix", {
      p_sku_id: input.sku_id,
      p_location_id: input.location_id,
      p_inventory_type: input.inventory_type,
      p_availability: input.availability,
    });
    return { data, error };
  },

  // ============= Fulfillment nodes =============

  async updateFulfillmentNodeStatus(nodeId: string, status: string) {
    const { data, error } = await sb
      .from("salsabil_fulfillment_nodes")
      .update({ status })
      .eq("id", nodeId)
      .select("id")
      .single();
    return { data, error };
  },
};
