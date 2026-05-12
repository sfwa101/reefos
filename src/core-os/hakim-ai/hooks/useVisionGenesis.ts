/** @deprecated Replaced by Vision Cortex (`@/core/vision/gateway/hooks#useInferEntity`). */
/**
 * useVisionGenesis — Phase 7 Part 2 client adapter.
 * Wraps the `vision_genesis` edge function in a TanStack mutation:
 * accepts a File (or raw base64), converts to base64, invokes the
 * function, and returns a sanitized USA payload.
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

async function fileToBase64(file: File): Promise<{ base64: string; mime: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("file_read_error"));
    reader.onload = () => {
      const result = String(reader.result ?? "");
      const [, b64 = ""] = result.split(",");
      resolve({ base64: b64, mime: file.type || "image/jpeg" });
    };
    reader.readAsDataURL(file);
  });
}

export type VisionGenesisInput = { file: File; hint?: string };

export function useVisionGenesis() {
  return useMutation<USAGenesisPayload, Error, VisionGenesisInput>({
    mutationFn: async ({ file, hint }) => {
      const { base64, mime } = await fileToBase64(file);
      const { data, error } = await supabase.functions.invoke("vision_genesis", {
        body: { image_base64: base64, mime_type: mime, hint },
      });
      if (error) {
        const code =
          (data as { error?: VisionGenesisError } | null)?.error ?? "unknown";
        throw new Error(code);
      }
      const payload = data as { error?: VisionGenesisError } & USAGenesisPayload;
      if (!payload || payload.error) {
        throw new Error(payload?.error ?? "unknown");
      }
      return payload;
    },
  });
}
