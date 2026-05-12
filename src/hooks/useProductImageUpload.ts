// Encapsulates Supabase Storage uploads for the `product-images` bucket so
// admin pages don't import the raw client directly (Article 5 exemption —
// client-only storage operations live in dedicated hooks).
import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

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
    const { error: upErr } = await supabase.storage
      .from("product-images")
      .upload(path, input.file, {
        contentType: input.contentType ?? "image/png",
        upsert: false,
      });
    if (upErr) throw new Error(upErr.message);
    const { data } = supabase.storage.from("product-images").getPublicUrl(path);
    return data.publicUrl ?? null;
  }, []);

  return { upload };
}
