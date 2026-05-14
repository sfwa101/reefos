/**
 * Vision Cortex — Sovereign Server Functions (Wave P-4.1).
 *
 * Replaces the legacy edge functions:
 *   - vision_genesis            → visionGenesisFn
 *   - generate_embedding        → generateEmbeddingFn
 *   - process_image_aesthetic   → processImageAestheticFn (disabled stub)
 *   - generate-product-image    → generateProductImagesFn
 *
 * All handlers run inside TanStack `createServerFn` and require an
 * authenticated Supabase session via `requireSupabaseAuth`. Heavy logic
 * lives in the sibling `genesis.server.ts` module to keep this file
 * splitter-safe.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  runVisionGenesis,
  generateDeterministicEmbedding,
  generateProductImageBytes,
  type VisionGenesisOutput,
} from "./genesis.server";

// ─── visionGenesisFn ────────────────────────────────────────────────────

const visionGenesisSchema = z.object({
  image_base64: z.string().min(1).optional(),
  secondary_image_base64: z.string().min(1).nullable().optional(),
  images_base64: z.array(z.string().min(1)).max(4).optional(),
  hint: z.string().max(2000).optional(),
  provider: z.enum(["gemini", "openrouter", "deepseek"]).optional(),
});

export const visionGenesisFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => visionGenesisSchema.parse(input))
  .handler(async ({ data }): Promise<VisionGenesisOutput> => {
    return runVisionGenesis(data);
  });

// ─── generateEmbeddingFn ────────────────────────────────────────────────

const embeddingSchema = z.object({
  text: z.string().min(1).max(8000),
});

export const generateEmbeddingFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => embeddingSchema.parse(input))
  .handler(async ({ data }): Promise<{ embedding: number[]; dimensions: number }> => {
    const embedding = await generateDeterministicEmbedding(data.text);
    return { embedding, dimensions: embedding.length };
  });

// ─── processImageAestheticFn (currently disabled — preserved API) ──────

const aestheticSchema = z.object({
  image_base64: z.string().min(1),
  mime_type: z.string().min(1),
  style: z.string().min(1),
  palette_name: z.string().nullable().optional(),
  palette_hex: z.string().nullable().optional(),
});

export interface AestheticOutput {
  ok: boolean;
  disabled: boolean;
  reason?: string;
  image_data_url: string | null;
  processed_at: string;
}

export const processImageAestheticFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => aestheticSchema.parse(input))
  .handler(async (): Promise<AestheticOutput> => {
    // Mirrors the legacy edge fn behavior: pipeline temporarily offline.
    return {
      ok: false,
      disabled: true,
      reason: "aesthetic_pipeline_offline",
      image_data_url: null,
      processed_at: new Date().toISOString(),
    };
  });

// ─── generateProductImagesFn ────────────────────────────────────────────

const productImageSchema = z.object({
  ids: z.array(z.string().uuid()).max(50).optional(),
  limit: z.number().int().min(1).max(50).optional(),
});

interface ProductImageResult {
  id: string;
  ok: boolean;
  url?: string;
  error?: string;
}

const BUCKET = "product-images";

export const generateProductImagesFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => productImageSchema.parse(input))
  .handler(
    async ({ data }): Promise<{ processed: number; results: ProductImageResult[] }> => {
      const sb = supabaseAdmin as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            limit: (n: number) => Promise<{ data: ProductRow[] | null; error: unknown }>;
            in: (
              col: string,
              vals: string[],
            ) => Promise<{ data: ProductRow[] | null; error: unknown }>;
          };
          update: (
            patch: Record<string, unknown>,
          ) => { eq: (c: string, v: string) => Promise<{ error: unknown }> };
        };
        storage: {
          from: (b: string) => {
            upload: (
              path: string,
              bytes: Uint8Array,
              opts: { contentType: string; upsert: boolean },
            ) => Promise<{ error: unknown }>;
            getPublicUrl: (path: string) => { data: { publicUrl: string } };
          };
        };
      };
      interface ProductRow {
        id: string;
        name: string;
        source: string | null;
      }

      const baseSelect = sb.from("products").select("id, name, source");
      const queryRes =
        Array.isArray(data.ids) && data.ids.length
          ? await baseSelect.in("id", data.ids)
          : await baseSelect.limit(data.limit ?? 50);
      if (queryRes.error)
        throw new Error(`product_query_failed: ${String((queryRes.error as Error)?.message ?? queryRes.error)}`);
      const rows: ProductRow[] = queryRes.data ?? [];

      const results: ProductImageResult[] = [];
      for (const row of rows) {
        try {
          const png = await generateProductImageBytes(row.name, row.source);
          const path = `ai/${row.id}-${Date.now()}.png`;
          const up = await sb.storage
            .from(BUCKET)
            .upload(path, png, { contentType: "image/png", upsert: true });
          if (up.error) throw up.error;
          const { data: pub } = sb.storage.from(BUCKET).getPublicUrl(path);
          const url = pub.publicUrl;
          const upd = await sb
            .from("products")
            .update({ image_url: url, image: url })
            .eq("id", row.id);
          if (upd.error) throw upd.error;
          results.push({ id: row.id, ok: true, url });
        } catch (e) {
          results.push({ id: row.id, ok: false, error: (e as Error).message });
        }
      }
      return { processed: results.length, results };
    },
  );
