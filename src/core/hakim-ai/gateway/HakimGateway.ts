/**
 * HakimGateway — Sovereign façade for Hakim AI edge invocations.
 *
 * Constitution v2.0 · Article 4 (Sovereign Isolation) · Article 8 (Runtime First).
 * SUPABASE_SOVEREIGNTY · §3 (Gateway Pattern).
 *
 * The UI layer is FORBIDDEN from importing the Supabase client to call
 * `supabase.functions.invoke(...)`. Every Hakim/Vision edge function
 * invocation MUST transit through this gateway. Concrete function names
 * stay internal to this file — UI consumers see only typed VMs.
 */
import { supabase } from "@/integrations/supabase/client";

// ─── Vision Genesis (Product DNA) ────────────────────────────────────────

export interface InferProductDNAInput {
  /**
   * Phase C-4 — inline `data:image/<mime>;base64,...` URL produced by the
   * Universal Compression Engine. Must be < 150 KB after compression to
   * keep the Deno isolate safe and the AI Gateway happy.
   */
  readonly image_base64: string;
  /** Optional secondary photo data URL (e.g. nutrition label). */
  readonly secondary_image_base64?: string | null;
  /** Free-text steering hint forwarded to the model. */
  readonly hint?: string;
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
  readonly traits: string[];
  readonly category_path?: string | null;
  readonly brand?: string | null;
  readonly origin_country?: string | null;
  readonly marketing?: { short: string | null; long: string | null } | null;
  readonly nutrition?: Record<string, number | null> | null;
  readonly physical?: { net_weight: number | null; weight_unit: string | null } | null;
  readonly allergens?: string[] | null;
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

/**
 * Try to extract a structured `{ error, details }` envelope from a
 * `FunctionsHttpError`. Edge functions returning non-2xx responses
 * surface as `error.context.response` — which we clone and parse here.
 */
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
  /**
   * Inference Step — Phase C-4. Sends compressed inline base64 images
   * (≤ ~150 KB each) to the `vision_genesis` edge function and returns
   * the sanitized Universal Salsabil Asset Product DNA payload.
   *
   * Pre-condition: callers MUST run images through the Universal
   * Compression Engine (`compressImage` + `blobToDataUrl`) BEFORE invoking
   * this gateway. Raw multi-MB blobs would re-introduce the Deno OOM crash.
   */
  async inferProductDNA(
    input: InferProductDNAInput,
  ): Promise<ProductDNAPayload> {
    if (!input.image_base64 || typeof input.image_base64 !== "string") {
      throw new Error("image_base64 is required");
    }
    if (!input.image_base64.startsWith("data:image/")) {
      throw new Error("image_base64 must be a data: URL (image/*)");
    }

    const { data, error } = await supabase.functions.invoke("vision_genesis", {
      body: {
        image_base64: input.image_base64,
        secondary_image_base64: input.secondary_image_base64 ?? null,
        hint: input.hint,
      },
    });

    if (error) {
      const env = await readErrorEnvelope(error, data);
      const message =
        env?.details || env?.error || (error as Error).message || "unknown";
      throw new Error(message);
    }

    const payload = data as
      | (ProductDNAPayload & { error?: HakimErrorCode; details?: string })
      | null;
    if (!payload || (payload as { error?: string }).error) {
      throw new Error(
        payload?.details || (payload as { error?: string })?.error || "unknown",
      );
    }
    return payload;
  },
} as const;

export type HakimGatewayType = typeof HakimGateway;
