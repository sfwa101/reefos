// Encapsulates product image uploads. Storage I/O is delegated to the
// sovereign MediaGateway (Constitution v2.0 · Article 4).
import { useCallback } from "react";
import { MediaGateway } from "@/core/media";

type UploadInput = {
  file: Blob;
  prefix: string;
  contentType?: string;
  ext?: string;
};

export function useProductImageUpload() {
  const upload = useCallback(async (input: UploadInput): Promise<string | null> => {
    const ext = (input.ext ?? "png").replace(/^\./, "").toLowerCase();
    const path = `${input.prefix.replace(/\/+$/, "")}/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}.${ext}`;
    const { publicUrl } = await MediaGateway.uploadFile({
      bucket: "product-images",
      path,
      file: input.file,
      contentType: input.contentType ?? "image/png",
      upsert: false,
    });
    return publicUrl;
  }, []);

  return { upload };
}
