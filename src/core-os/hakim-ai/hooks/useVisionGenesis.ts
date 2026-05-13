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

/** Lightweight base64 encoder — no canvas resize, trust native pipeline. */

async function fileToBase64(file: File): Promise<{ base64: string; mime: string }> {
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("file_read_error"));
    reader.onload = () => {
      const result = String(reader.result ?? "");
      const [, b64 = ""] = result.split(",");
      resolve(b64);
    };
    reader.readAsDataURL(file);
  });
  return { base64, mime: file.type || "image/jpeg" };
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
      const { base64, mime } = await fileToBase64(file);
      const secondary = secondaryFile
        ? await fileToBase64(secondaryFile)
        : null;
      const { data, error } = await supabase.functions.invoke("vision_genesis", {
        body: {
          image_base64: base64,
          mime_type: mime,
          hint,
          secondary_image_base64: secondary?.base64 ?? null,
          secondary_mime_type: secondary?.mime ?? null,
        },
      });
      // Try to surface the structured `details` from the edge function body.
      // supabase.functions.invoke wraps non-2xx in `FunctionsHttpError` whose
      // `context.response` is a Response we can re-parse.
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
