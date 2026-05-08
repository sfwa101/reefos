// Phase 13 — Imperial Aesthetic Pipeline
// Background removal + soft pastel/white background injection via Lovable AI
// Gateway (google/gemini-2.5-flash-image, aka Nano Banana). Returns a clean
// base64 PNG ready to be uploaded to the product-images bucket.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

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

const STYLE_PROMPTS: Record<string, string> = {
  white:
    "Remove the original background entirely and place the subject on a pure clean white seamless studio background (#FFFFFF). Keep the subject crisp, centered, with soft natural shadow. Do not alter the product itself.",
  pastel_pink:
    "Remove the original background entirely and place the subject on a soft pastel pink background (#FCE7F3) with subtle vignette. Centered, e-commerce catalog style, soft natural shadow. Do not alter the product.",
  pastel_mint:
    "Remove the original background entirely and place the subject on a soft pastel mint background (#D1FAE5). Centered, e-commerce catalog style, soft natural shadow. Do not alter the product.",
  pastel_cream:
    "Remove the original background entirely and place the subject on a warm pastel cream background (#FEF3C7). Centered, e-commerce catalog style, soft natural shadow. Do not alter the product.",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON_KEY =
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ||
      Deno.env.get("SUPABASE_ANON_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "missing_key" }, 500);

    // Auth gate — admin/vendor session required
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "unauthorized" }, 401);

    const { image_base64, mime_type, style } = await req
      .json()
      .catch(() => ({}));
    if (!image_base64 || typeof image_base64 !== "string") {
      return json({ error: "missing_image" }, 400);
    }

    const mt =
      typeof mime_type === "string" && mime_type.startsWith("image/")
        ? mime_type
        : "image/jpeg";
    const dataUrl = image_base64.startsWith("data:")
      ? image_base64
      : `data:${mt};base64,${image_base64}`;

    const styleKey =
      typeof style === "string" && style in STYLE_PROMPTS ? style : "white";
    const instruction = STYLE_PROMPTS[styleKey];

    const aiRes = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image",
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: instruction },
                { type: "image_url", image_url: { url: dataUrl } },
              ],
            },
          ],
          modalities: ["image", "text"],
        }),
      },
    );

    if (aiRes.status === 429) return json({ error: "rate_limited" }, 429);
    if (aiRes.status === 402) return json({ error: "credits_exhausted" }, 402);
    if (!aiRes.ok) {
      const t = await aiRes.text();
      console.error("aesthetic AI error", aiRes.status, t);
      return json({ error: "ai_error" }, 500);
    }

    const aiData = await aiRes.json();
    const imageUrl: string | undefined =
      aiData?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!imageUrl) {
      console.error("no image in response", JSON.stringify(aiData).slice(0, 400));
      return json({ error: "ai_parse_error" }, 500);
    }

    return json({
      ok: true,
      image_data_url: imageUrl,
      style: styleKey,
      processed_at: new Date().toISOString(),
    });
  } catch (e) {
    console.error("process_image_aesthetic error", e);
    return json({ error: e instanceof Error ? e.message : "unknown" }, 500);
  }
});
