/**
 * HakimGateway — Sovereign façade for the Hakim AI domain.
 *
 * Wraps direct Supabase access (RPCs, edge function invocations, realtime
 * subscriptions, table reads/writes) used by Hakim hooks and surfaces. UI
 * code is FORBIDDEN from importing the Supabase client to call any of these
 * methods. Pre-existing `any` casts preserved (Wave P-7 will harden types).
 */
import { supabase } from "@/integrations/supabase/client";
import {
  visionGenesisFn,
  generateEmbeddingFn,
  processImageAestheticFn,
} from "@/core/vision/vision.functions";
import { hakimPulseFn } from "@/core/hakim-ai/hakim.functions";
import { predictBasketFn } from "@/core/orders/predict.functions";

export type GatewayChannel = { unsubscribe: () => void };

type DynamicRpc = <T = unknown>(
  name: string,
  args?: Record<string, unknown>,
) => Promise<{ data: T | null; error: { message: string } | null }>;
const rpcDynamic = supabase.rpc.bind(supabase) as unknown as DynamicRpc;

// ─── Vision Genesis (Product DNA) ────────────────────────────────────────

export interface InferProductDNAInput {
  readonly image_base64: string;
  readonly secondary_image_base64?: string | null;
  readonly hint?: string;
  readonly provider?: "gemini" | "openrouter" | "deepseek";
}

export interface ProductDNAAsset {
  readonly name: string;
  readonly description: string;
  readonly asset_type:
    | "physical"
    | "digital"
    | "service"
    | "rental"
    | "milestone_project";
  readonly traits: string[] | Record<string, unknown>;
  readonly category_path?: string | null;
  readonly brand?: string | null;
  readonly origin_country?: string | null;
  readonly marketing?: { short: string | null; long: string | null } | null;
  readonly nutrition?: Record<string, number | null> | null;
  readonly physical?: { net_weight: number | null; weight_unit: string | null } | null;
  readonly allergens?: string[] | null;
  readonly barcode?: string | null;
  readonly halal?: boolean | null;
  readonly tier_rules?: Record<string, unknown> | null;
  readonly media?: string[];
}

export interface ProductDNASku {
  readonly sku_code: string;
  readonly attributes: Record<string, unknown>;
  readonly barcode?: string | null;
  readonly variant_axes?: Record<string, string | null> | null;
}

export interface ProductDNAContract {
  readonly pricing_model:
    | "flat"
    | "tiered_wholesale"
    | "subscription"
    | "deposit_and_rental"
    | "milestone_installments";
  readonly base_price: number;
  readonly currency: "EGP" | "USD" | "EUR";
  readonly contract_rules: Record<string, unknown>;
}

export interface ProductDNAPayload {
  readonly ok: true;
  readonly asset: ProductDNAAsset;
  readonly skus: ProductDNASku[];
  readonly financial_contract: ProductDNAContract;
  readonly generated_at: string;
}

export type HakimErrorCode =
  | "rate_limited"
  | "credits_exhausted"
  | "unauthorized"
  | "ai_error"
  | "ai_parse_error"
  | "missing_image"
  | "missing_key"
  | "unknown";

async function readErrorEnvelope(
  err: unknown,
  fallbackData: unknown,
): Promise<{ error?: string; details?: string } | null> {
  try {
    const ctx = (err as { context?: { response?: Response } } | null)?.context;
    if (ctx?.response) {
      const text = await ctx.response.clone().text();
      try {
        return JSON.parse(text);
      } catch {
        return { details: text };
      }
    }
  } catch {
    /* noop */
  }
  if (fallbackData && typeof fallbackData === "object") {
    return fallbackData as { error?: string; details?: string };
  }
  return null;
}

export const HakimGateway = {
  // ============= Vision Genesis =============

  async inferProductDNA(input: InferProductDNAInput): Promise<ProductDNAPayload> {
    if (!input.image_base64 || typeof input.image_base64 !== "string") {
      throw new Error("image_base64 is required");
    }
    if (!input.image_base64.startsWith("data:image/")) {
      throw new Error("image_base64 must be a data: URL (image/*)");
    }

    let raw: unknown;
    try {
      raw = await visionGenesisFn({
        data: {
          image_base64: input.image_base64,
          secondary_image_base64: input.secondary_image_base64 ?? null,
          hint: input.hint,
          provider: input.provider ?? "gemini",
        },
      });
    } catch (err) {
      throw new Error((err as Error)?.message ?? "unknown");
    }

    const payload = raw as
      | { ok?: boolean; error?: string; details?: string }
      | null;
    if (!payload || payload.ok === false || payload.error) {
      throw new Error(payload?.details || payload?.error || "unknown");
    }
    return payload as unknown as ProductDNAPayload;
  },

  // ============= Edge function invocations =============

  async invokeHakimPulse(body: { page: string; tiles: unknown[] }) {
    try {
      const data = await hakimPulseFn({ data: body });
      return { data, error: null as null | { message: string } };
    } catch (e) {
      return { data: null, error: { message: (e as Error)?.message ?? "pulse_failed" } };
    }
  },

  async invokeGenerateEmbedding(text: string) {
    try {
      const data = await generateEmbeddingFn({ data: { text } });
      return { data, error: null as null | { message: string } };
    } catch (e) {
      return { data: null, error: { message: (e as Error)?.message ?? "embedding_failed" } };
    }
  },

  async invokePredictBasket() {
    try {
      const data = await predictBasketFn();
      return { data, error: null as null | { message: string } };
    } catch (e) {
      return { data: null, error: { message: (e as Error)?.message ?? "predict_failed" } };
    }
  },

  async invokeProcessImageAesthetic(body: {
    image_base64: string;
    mime_type: string;
    style: string;
    palette_name: string | null;
    palette_hex: string | null;
  }) {
    try {
      const data = await processImageAestheticFn({ data: body });
      return { data, error: null as null | { message: string } };
    } catch (e) {
      return { data: null, error: { message: (e as Error)?.message ?? "aesthetic_failed" } };
    }
  },

  async getAccessTokenForChat(): Promise<string | null> {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  },

  // ============= Anomalies (table + realtime) =============

  async listAnomalies(limit: number) {
    const { data } = await supabase
      .from("hakim_anomalies")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    return data ?? [];
  },

  subscribeAnomalies(onChange: () => void): GatewayChannel {
    const channel = supabase
      .channel("hakim_anomalies_feed")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "hakim_anomalies" },
        () => onChange(),
      )
      .subscribe();
    return { unsubscribe: () => { supabase.removeChannel(channel); } };
  },

  async getPulseStats(minutes: number) {
    const { data } = await supabase.rpc("hakim_pulse_stats", { _minutes: minutes });
    return data;
  },

  async resolveAnomaly(id: string) {
    const { error } = await supabase.rpc("resolve_anomaly", { _id: id });
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
      await supabase.rpc("report_anomaly", {
        _type: input.type,
        _severity: input.severity,
        _description: input.description.slice(0, 500),
        _payload: input.payload as never,
        _source: input.source,
        _fingerprint: input.fingerprint ?? undefined,
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
    // `update_universal_asset` is not present in generated Database types.
    const { data, error } = await rpcDynamic("update_universal_asset", {
      p_asset_id: input.asset_id,
      p_name: input.name,
      p_description: input.description,
      p_base_price: input.base_price,
    });
    return { data, error };
  },

  async mintUniversalAsset(payload: unknown) {
    const { data, error } = await supabase.rpc("mint_universal_asset", {
      payload: payload as never,
    });
    return { data, error };
  },

  async updateAssetTraits(assetId: string, traits: string[]) {
    const { error } = await supabase
      .from("salsabil_assets")
      .update({ traits: traits as never })
      .eq("id", assetId);
    return { error };
  },

  async matchUniversalAsset(embedding: number[], threshold: number) {
    const { data, error } = await supabase.rpc("match_universal_asset", {
      p_embedding: embedding as never,
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
    const { data, error } = await supabase.rpc("upsert_inventory_matrix", {
      p_sku_id: input.sku_id,
      p_location_id: input.location_id,
      p_inventory_type: input.inventory_type,
      p_availability: input.availability as never,
    });
    return { data, error };
  },

  // ============= Fulfillment nodes =============

  async updateFulfillmentNodeStatus(nodeId: string, status: string) {
    const { data, error } = await supabase
      .from("salsabil_fulfillment_nodes")
      .update({ status })
      .eq("id", nodeId)
      .select("id")
      .single();
    return { data, error };
  },
} as const;

export type HakimGatewayType = typeof HakimGateway;
