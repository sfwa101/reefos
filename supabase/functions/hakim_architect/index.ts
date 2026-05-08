// Hakim The Engineer V1 — Phase 16
// Translates an Emperor's natural-language business prompt into a Sovereign
// Blueprint: { module_name, description, suggested_assets[], sdui_layout }.
// Uses the Lovable AI Gateway (Google Gemini) with structured tool-calling
// to guarantee a strict JSON shape consumable by the Sovereign Executor.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM_PROMPT = `أنت "حكيم"، كبير المهندسين المعماريين لمنصة سلسبيل OS.
سيأمرك الإمبراطور ببناء قطاع أعمال جديد. مهمتك إعادة مخطط JSON صارم
يصف الوحدة (module_name, description) ومصفوفة من الأصول المقترحة
(suggested_assets) وهيكل SDUI تقريبي (sdui_layout). كن دقيقاً، عملياً،
واستخدم العربية لجميع الأسماء والأوصاف.`;

const TOOL_SCHEMA = {
  type: "function",
  function: {
    name: "submit_blueprint",
    description: "Return a Sovereign Blueprint for a new business vertical.",
    parameters: {
      type: "object",
      properties: {
        module_name: { type: "string", description: "اسم القطاع بالعربية" },
        description: { type: "string", description: "وصف القطاع وغرضه" },
        suggested_assets: {
          type: "array",
          minItems: 3,
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              asset_type: {
                type: "string",
                enum: ["physical", "service", "digital", "rental", "milestone_project"],
              },
              pricing_model: {
                type: "string",
                enum: ["flat", "tiered_wholesale", "subscription", "deposit_and_rental", "milestone_installments"],
              },
              base_price: { type: "number" },
              traits: {
                type: "object",
                description: "خصائص ديناميكية (duration, brand, capacity, ...)",
              },
            },
            required: ["name", "asset_type", "pricing_model", "base_price", "traits"],
            additionalProperties: false,
          },
        },
        sdui_layout: {
          type: "object",
          description: "هيكل تقريبي للعرض على تطبيق الموبايل",
          properties: {
            hero: { type: "object" },
            sections: { type: "array", items: { type: "object" } },
          },
        },
      },
      required: ["module_name", "description", "suggested_assets", "sdui_layout"],
      additionalProperties: false,
    },
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt } = await req.json().catch(() => ({}));
    if (!prompt || typeof prompt !== "string" || prompt.trim().length < 4) {
      return new Response(
        JSON.stringify({ error: "missing_or_short_prompt" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "missing_lovable_api_key" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ],
        tools: [TOOL_SCHEMA],
        tool_choice: { type: "function", function: { name: "submit_blueprint" } },
      }),
    });

    if (aiRes.status === 429) {
      return new Response(JSON.stringify({ error: "rate_limited" }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (aiRes.status === 402) {
      return new Response(JSON.stringify({ error: "credits_exhausted" }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!aiRes.ok) {
      const txt = await aiRes.text();
      console.error("hakim_architect ai error", aiRes.status, txt);
      return new Response(JSON.stringify({ error: "ai_error", detail: txt }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const json = await aiRes.json();
    const call = json?.choices?.[0]?.message?.tool_calls?.[0];
    const argsRaw = call?.function?.arguments;
    if (!argsRaw) {
      return new Response(JSON.stringify({ error: "ai_no_tool_call", raw: json }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let blueprint: unknown;
    try {
      blueprint = typeof argsRaw === "string" ? JSON.parse(argsRaw) : argsRaw;
    } catch (e) {
      return new Response(
        JSON.stringify({ error: "ai_parse_error", detail: String(e) }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ ok: true, blueprint, generated_at: new Date().toISOString() }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("hakim_architect fatal", err);
    return new Response(
      JSON.stringify({ error: "server_error", detail: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
