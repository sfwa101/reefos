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

/**
 * Client-side compression: draws the file to a canvas, scales the longest
 * edge to <= 1024px, and exports as JPEG @ 0.7 quality before base64-encoding.
 * Cuts a typical 6 MB camera photo to ~150–300 KB so the dual-image payload
 * stays well under the Edge Function body limit (~6 MB).
 */
const MAX_EDGE = 1024;
const JPEG_QUALITY = 0.7;

async function fileToBase64(file: File): Promise<{ base64: string; mime: string }> {
  // Decode the image off the main thread when possible.
  const bitmap = await createImageBitmap(file).catch(() => null);
  let width: number;
  let height: number;
  let drawSource: CanvasImageSource;

  if (bitmap) {
    width = bitmap.width;
    height = bitmap.height;
    drawSource = bitmap;
  } else {
    // Fallback for browsers without createImageBitmap support for the file type.
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("file_read_error"));
      reader.onload = () => resolve(String(reader.result ?? ""));
      reader.readAsDataURL(file);
    });
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("image_decode_error"));
      el.src = dataUrl;
    });
    width = img.naturalWidth || img.width;
    height = img.naturalHeight || img.height;
    drawSource = img;
  }

  const scale = Math.min(1, MAX_EDGE / Math.max(width, height));
  const targetW = Math.max(1, Math.round(width * scale));
  const targetH = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas_unavailable");
  ctx.drawImage(drawSource, 0, 0, targetW, targetH);
  if (bitmap && "close" in bitmap) {
    try { (bitmap as ImageBitmap).close(); } catch { /* noop */ }
  }

  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("canvas_to_blob_failed"))),
      "image/jpeg",
      JPEG_QUALITY,
    );
  });

  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("file_read_error"));
    reader.onload = () => {
      const result = String(reader.result ?? "");
      const [, b64 = ""] = result.split(",");
      resolve(b64);
    };
    reader.readAsDataURL(blob);
  });

  return { base64, mime: "image/jpeg" };
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
