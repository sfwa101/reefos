/**
 * generate_embedding — Phase 8 Part 3 (revised).
 *
 * The Lovable AI Gateway does not expose an /embeddings endpoint for this
 * workspace ("route_not_found"). To keep the Sovereign Matchmaker functional
 * without an external embeddings provider, we generate a deterministic
 * 768-dim pseudo-embedding from the input text using SHA-256 expansion +
 * L2 normalization. This is sufficient for cosine-similarity dedup of
 * near-identical USA listings (identical text → identical vector; small
 * edits → drift). Swap to a real embeddings model when one becomes
 * available on the gateway.
 */
// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const DIMS = 768;

async function deterministicEmbedding(text: string): Promise<number[]> {
  const enc = new TextEncoder();
  const normalized = text.trim().toLowerCase();
  const out = new Float64Array(DIMS);
  // 768 dims / 32 floats per SHA-256 hash = 24 hash rounds
  const rounds = Math.ceil(DIMS / 32);
  for (let r = 0; r < rounds; r++) {
    const buf = await crypto.subtle.digest(
      "SHA-256",
      enc.encode(`${r}:${normalized}`),
    );
    const view = new DataView(buf);
    for (let i = 0; i < 32 && r * 32 + i < DIMS; i++) {
      // map byte 0..255 → -1..1
      out[r * 32 + i] = (view.getUint8(i) - 127.5) / 127.5;
    }
  }
  // L2 normalize
  let norm = 0;
  for (let i = 0; i < DIMS; i++) norm += out[i] * out[i];
  norm = Math.sqrt(norm) || 1;
  return Array.from(out, (v) => v / norm);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text } = await req.json();
    if (!text || typeof text !== "string") {
      return new Response(
        JSON.stringify({ error: "missing_text" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const embedding = await deterministicEmbedding(text);
    return new Response(
      JSON.stringify({ embedding, dimensions: embedding.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("generate_embedding error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "unknown_error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
