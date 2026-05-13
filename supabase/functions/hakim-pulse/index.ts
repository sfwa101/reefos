// Hakim's Pulse — TEMPORARILY DISABLED (Sovereign mode, Phase C-4+).
//
// The previous implementation called `ai.gateway.lovable.dev` which now
// returns 402 Payment Required on this account, polluting the console and
// crashing dependent UI. Until this function is migrated to the sovereign
// Gemini / OpenRouter keys, we return a harmless 200 OK with empty
// insights so callers degrade gracefully.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const tiles = Array.isArray((body as any)?.tiles) ? (body as any).tiles : [];
    // Batched mode → empty insights map (UI hides the badge).
    if (tiles.length > 0) {
      return new Response(JSON.stringify({ insights: {}, disabled: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // Legacy single-pulse mode → empty pulse string.
    return new Response(JSON.stringify({ pulse: "", disabled: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ insights: {}, pulse: "", disabled: true, soft_error: e instanceof Error ? e.message : "unknown" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
