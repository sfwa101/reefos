/**
 * useVisionGenesis — Sovereign Vision Hook (Phase C-4).
 *
 * Routes via createServerFn — zero edge calls.
 *
 * Constitutional flow:
 *   UI → ImageCompressor (max 1024px, WebP q≈0.8, < 150 KB)
 *      → blobToDataUrl (inline base64)
 *      → HakimGateway.inferProductDNA
 *      → visionGenesisFn (createServerFn + requireSupabaseAuth)
 *      → runVisionGenesis (server)
 *
 * The hook owns NO direct Supabase imports, NO `functions.invoke` calls,
 * and NO Storage uploads for vision inference. All server-side work runs
 * inside a TanStack server function — there are no Supabase Edge Functions
 * in this path. Storage is not in the critical path; the AI Gateway
 * receives inline base64 data directly.
 */
import { useMutation } from "@tanstack/react-query";
import { compressImage, blobToDataUrl } from "@/core/media";
import { HakimGateway, type ProductDNAPayload } from "@/core/hakim-ai";

// Backwards-compatible type aliases — downstream consumers (USAEditor,
// VisionGenesisUploader, SmartProductComposer, useMintUSA) import these
// names. We keep the surface stable while the internals move to the
// gateway.
export type USAGenesisAsset = ProductDNAPayload["asset"];
export type USAGenesisSku = ProductDNAPayload["skus"][number];
export type USAGenesisContract = ProductDNAPayload["financial_contract"];
export type USAGenesisPayload = ProductDNAPayload;

export type VisionGenesisError =
  | "rate_limited"
  | "credits_exhausted"
  | "unauthorized"
  | "ai_error"
  | "ai_parse_error"
  | "missing_image"
  | "missing_key"
  | "unknown";

async function fileToCompressedDataUrl(file: File): Promise<string> {
  // WAVE R-2 (C-3 fix): cap longest edge at 800px and re-encode as JPEG q=0.85
  // before base64 transit to keep server payloads under the safe ceiling.
  const compressed = await compressImage(file, {
    maxDimension: 800,
    quality: 0.85,
    mimeType: "image/jpeg",
  });
  return blobToDataUrl(compressed);
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
      // 1) Universal Compression — shrink in the browser to a few KB.
      const image_base64 = await fileToCompressedDataUrl(file);
      const secondary_image_base64 = secondaryFile
        ? await fileToCompressedDataUrl(secondaryFile)
        : null;

      // 2) Sovereign inference through the HakimGateway.
      return HakimGateway.inferProductDNA({
        image_base64,
        secondary_image_base64,
        hint,
      });
    },
  });
}
