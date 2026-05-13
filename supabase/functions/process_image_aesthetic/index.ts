// Phase 13 — Imperial Aesthetic Pipeline — TEMPORARILY DISABLED.
//
// The previous implementation called `ai.gateway.lovable.dev` (Nano Banana)
// which now returns 402 Payment Required. To stop polluting the console
// and crashing the UI we return a harmless 200 OK signaling the feature is
// disabled. Migration target: native Gemini image edit via Deno.env("Gemini").
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    return json({
      ok: false,
      disabled: true,
      reason: "aesthetic_pipeline_offline",
      image_data_url: null,
      processed_at: new Date().toISOString(),
    });
  } catch (e) {
    return json({ ok: false, disabled: true, soft_error: e instanceof Error ? e.message : "unknown" });
  }
});
