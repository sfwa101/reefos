/**
 * useVisionGenesis — Sovereign Vision Hook (Phase C-1).
 *
 * Constitutional flow:
 *   UI → MediaGateway (Storage Bypass upload)
 *      → HakimGateway (Inference invocation)
 *
 * The hook is a pure orchestration layer: it owns NO direct Supabase
 * imports, NO Base64 payloads, and NO `functions.invoke` calls. All
 * infrastructure access is delegated to Sovereign Gateways.
 */
import { useMutation } from "@tanstack/react-query";
import { MediaGateway } from "@/core/media";
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

const STAGING_BUCKET = "product-images";
const STAGING_PREFIX = "vision-staging";

async function uploadToStaging(file: File): Promise<string> {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-60);
  const path = `${STAGING_PREFIX}/${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}-${safeName}`;
  const { publicUrl } = await MediaGateway.uploadFile({
    bucket: STAGING_BUCKET,
    path,
    file,
    contentType: file.type || "image/jpeg",
    upsert: false,
  });
  if (!publicUrl) throw new Error("storage_public_url_missing");
  return publicUrl;
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
      // 1) Storage Bypass — upload first, ship URLs only.
      const image_url = await uploadToStaging(file);
      const secondary_image_url = secondaryFile
        ? await uploadToStaging(secondaryFile)
        : null;

      // 2) Sovereign inference through the HakimGateway.
      return HakimGateway.inferProductDNA({
        image_url,
        secondary_image_url,
        hint,
      });
    },
  });
}
