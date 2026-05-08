/**
 * useAestheticProcessor — Phase 13 Imperial Aesthetic Pipeline.
 * Strips messy backgrounds and injects a clean white/pastel backdrop via the
 * `process_image_aesthetic` edge function, ensuring SDUI visual harmony for
 * every Universal Salsabil Asset minted into the Decentralized Matrix.
 */
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AestheticStyle =
  | "white"
  | "pastel_pink"
  | "pastel_mint"
  | "pastel_cream";

export type AestheticInput = {
  file?: File | null;
  base64?: string;
  mime?: string;
  style?: AestheticStyle;
};

export type AestheticResult = {
  /** data:image/png;base64,... — the purified image */
  imageDataUrl: string;
  style: AestheticStyle;
  processedAt: string;
};

export type AestheticError =
  | "rate_limited"
  | "credits_exhausted"
  | "unauthorized"
  | "ai_error"
  | "ai_parse_error"
  | "missing_image"
  | "missing_key"
  | "file_read_error"
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

export function useAestheticProcessor() {
  return useMutation<AestheticResult, Error, AestheticInput>({
    mutationFn: async ({ file, base64, mime, style = "white" }) => {
      let payloadB64 = base64 ?? "";
      let payloadMime = mime ?? "image/jpeg";
      if (file) {
        const r = await fileToBase64(file);
        payloadB64 = r.base64;
        payloadMime = r.mime;
      }
      if (!payloadB64) throw new Error("missing_image");

      const { data, error } = await supabase.functions.invoke(
        "process_image_aesthetic",
        {
          body: {
            image_base64: payloadB64,
            mime_type: payloadMime,
            style,
          },
        },
      );
      if (error) throw new Error(error.message ?? "unknown");
      if (!data?.ok || !data?.image_data_url) {
        throw new Error(data?.error ?? "ai_error");
      }
      return {
        imageDataUrl: data.image_data_url as string,
        style: data.style as AestheticStyle,
        processedAt: data.processed_at as string,
      };
    },
  });
}
