/**
 * MediaGateway — Sovereign façade for Lovable Cloud storage.
 *
 * Constitution v2.0 · Article 4 (Sovereign Isolation) ·
 * SUPABASE_SOVEREIGNTY · §3 (Gateway Pattern) · §10 (Forbidden Patterns).
 *
 * The UI layer is FORBIDDEN from importing the Supabase client to perform
 * storage I/O. All file uploads, public URL resolution, signed URL minting
 * and deletions MUST transit through this gateway. Concrete bucket names
 * stay internal to the call site (passed as a typed argument), but the
 * `supabase.storage.from(...)` invocation is constrained to this file.
 */
import { supabase } from "@/integrations/supabase/client";

export interface UploadFileInput {
  /** Storage bucket id (e.g. "product-images", "kyc-documents", "avatars"). */
  readonly bucket: string;
  /** Full object path inside the bucket. Caller owns naming/prefixing. */
  readonly path: string;
  /** File or Blob payload. */
  readonly file: Blob;
  /** Optional MIME type override. */
  readonly contentType?: string;
  /** Overwrite existing object at the same path. Defaults to `false`. */
  readonly upsert?: boolean;
}

export interface UploadFileResult {
  readonly path: string;
  /** Public URL — populated only for public buckets. */
  readonly publicUrl: string | null;
}

export const MediaGateway = {
  /** Upload a file to a Lovable Cloud storage bucket. */
  async uploadFile(input: UploadFileInput): Promise<UploadFileResult> {
    const { bucket, path, file, contentType, upsert } = input;
    const { error } = await supabase.storage.from(bucket).upload(path, file, {
      contentType: contentType ?? (file instanceof File ? file.type : undefined) ?? "application/octet-stream",
      upsert: upsert ?? false,
    });
    if (error) throw new Error(`media_upload_failed: ${error.message}`);
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return { path, publicUrl: data?.publicUrl ?? null };
  },

  /** Resolve a public URL for an object in a public bucket. */
  getPublicUrl(bucket: string, path: string): string | null {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data?.publicUrl ?? null;
  },

  /** Mint a time-limited signed URL for a private bucket. */
  async getSignedUrl(bucket: string, path: string, ttlSeconds: number): Promise<string | null> {
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, ttlSeconds);
    if (error) throw new Error(`media_signed_url_failed: ${error.message}`);
    return data?.signedUrl ?? null;
  },

  /** Delete one or more objects from a bucket. */
  async deleteFile(bucket: string, paths: string | readonly string[]): Promise<void> {
    const list = typeof paths === "string" ? [paths] : [...paths];
    const { error } = await supabase.storage.from(bucket).remove(list);
    if (error) throw new Error(`media_delete_failed: ${error.message}`);
  },
} as const;

export type MediaGatewayType = typeof MediaGateway;
