/** @deprecated Replaced by Vision Cortex (`@/core/vision/gateway/hooks#useInferEntity`). */
/**
 * useVisionGenesis — Storage Bypass edition (Phase N-6).
 * Uploads images to the public `product-images` bucket under
 * `vision-staging/` and passes ONLY URLs to the edge function.
 * No more base64 in the HTTP body.
 */
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type USAGenesisAsset = {
  name: string;
  description: string;
  asset_type: "physical" | "digital" | "service" | "rental" | "milestone_project";
  traits: string[];
  media?: string[];
};

export type USAGenesisSku = {
  sku_code: string;
  attributes: Record<string, unknown>;
};

export type USAGenesisContract = {
  pricing_model:
    | "flat"
    | "tiered_wholesale"
    | "subscription"
    | "deposit_and_rental"
    | "milestone_installments";
  base_price: number;
  currency: "EGP" | "USD" | "EUR";
  contract_rules: Record<string, unknown>;
};

export type USAGenesisPayload = {
  ok: true;
  asset: USAGenesisAsset;
  skus: USAGenesisSku[];
  financial_contract: USAGenesisContract;
  generated_at: string;
};

export type VisionGenesisError =
  | "rate_limited"
  | "credits_exhausted"
  | "unauthorized"
  | "ai_error"
  | "ai_parse_error"
  | "missing_image"
  | "missing_key"
  | "unknown";

const STAGING_BUCKET = "product-images";
const STAGING_PREFIX = "vision-staging";

async function uploadToStaging(file: File): Promise<string> {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-60);
  const path = `${STAGING_PREFIX}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`;
  const { error: upErr } = await supabase.storage
    .from(STAGING_BUCKET)
    .upload(path, file, {
      contentType: file.type || "image/jpeg",
      upsert: false,
    });
  if (upErr) throw new Error(`storage_upload_failed: ${upErr.message}`);
  const { data } = supabase.storage.from(STAGING_BUCKET).getPublicUrl(path);
  if (!data?.publicUrl) throw new Error("storage_public_url_missing");
  return data.publicUrl;
}

export type VisionGenesisInput = {
  file: File;
  hint?: string;
  /** Optional secondary photo (e.g. back of pack / nutrition label). */
  secondaryFile?: File | null;
};

export function useVisionGenesis() {
  return useMutation<USAGenesisPayload, Error, VisionGenesisInput>({
    mutationFn: async ({ file, hint, secondaryFile }) => {
      const image_url = await uploadToStaging(file);
      const secondary_image_url = secondaryFile
        ? await uploadToStaging(secondaryFile)
        : null;

      const { data, error } = await supabase.functions.invoke("vision_genesis", {
        body: { image_url, secondary_image_url, hint },
      });

      const readErrorBody = async (): Promise<{ error?: string; details?: string } | null> => {
        try {
          const ctx = (error as unknown as { context?: { response?: Response } } | null)?.context;
          if (ctx?.response) {
            const cloned = ctx.response.clone();
            const text = await cloned.text();
            try { return JSON.parse(text); } catch { return { details: text }; }
          }
        } catch { /* noop */ }
        if (data && typeof data === "object") return data as { error?: string; details?: string };
        return null;
      };
      if (error) {
        const body = await readErrorBody();
        const message = body?.details || body?.error || error.message || "unknown";
        throw new Error(message);
      }
      const payload = data as { error?: VisionGenesisError; details?: string } & USAGenesisPayload;
      if (!payload || payload.error) {
        throw new Error(payload?.details || payload?.error || "unknown");
      }
      return payload;
    },
  });
}
