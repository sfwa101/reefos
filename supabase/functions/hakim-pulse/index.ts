// Hakim's Pulse — batched per-tile micro-insights for embedded intelligence on KPI cards.
// Backwards compatible: still accepts { metrics, page } for the legacy single-pulse hero card.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Tile = { key: string; label: string; value: number | string };
type Tone = "positive" | "neutral" | "warning" | "critical";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const { metrics, page, tiles } = body as {
      metrics?: Record<string, unknown>;
      page?: string;
      tiles?: Tile[];
    };
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "missing_key" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---------- BATCHED MODE ----------
    if (Array.isArray(tiles) && tiles.length > 0) {
      const system = `أنت "حكيم" — المستشار المالي الذكي لمتجر "ريف المدينة".
لكل مقياس مُرسل، أعطِ جملة تحليلية قصيرة جداً (≤90 حرف) باللهجة العربية الاحترافية،
وحدد نبرة واحدة من: positive | neutral | warning | critical.
أرجع JSON فقط بالشكل: { "insights": { "<key>": { "text": "...", "tone": "..." } } }`;
      const user = `الصفحة: ${page ?? "dashboard"}
المقاييس:
${JSON.stringify(tiles, null, 2)}

أعد JSON الآن.`;

      const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
          response_format: { type: "json_object" },
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
        const t = await aiRes.text();
        console.error("AI error", aiRes.status, t);
        return new Response(JSON.stringify({ error: "ai_error" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const data = await aiRes.json();
      const raw = data?.choices?.[0]?.message?.content?.trim() ?? "{}";
      let parsed: { insights?: Record<string, { text: string; tone: Tone }> } = {};
      try {
        parsed = JSON.parse(raw);
      } catch {
        const m = raw.match(/\{[\s\S]*\}/);
        if (m) parsed = JSON.parse(m[0]);
      }
      const insights: Record<string, { text: string; tone: Tone }> = {};
      const validTones: Tone[] = ["positive", "neutral", "warning", "critical"];
      for (const t of tiles) {
        const ins = parsed.insights?.[t.key];
        if (ins && typeof ins.text === "string") {
          insights[t.key] = {
            text: ins.text.slice(0, 140),
            tone: validTones.includes(ins.tone as Tone) ? (ins.tone as Tone) : "neutral",
          };
        }
      }
      return new Response(JSON.stringify({ insights }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---------- LEGACY SINGLE-PULSE MODE ----------
    const system = `أنت "حكيم" — المستشار المالي الذكي لمتجر "ريف المدينة".
مهمتك: قراءة الأرقام المُرسلة وكتابة "نبضة" قصيرة جداً (سطرين فقط، 200 حرف كحد أقصى) باللهجة العربية الاحترافية.
لا تستخدم Markdown. ابدأ مباشرة بالملاحظة.`;
    const user = `الصفحة الحالية: ${page ?? "finance"}
الأرقام الحية:
${JSON.stringify(metrics ?? {}, null, 2)}

اكتب "نبضة حكيم" الآن.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
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
      const t = await aiRes.text();
      console.error("AI error", aiRes.status, t);
      return new Response(JSON.stringify({ error: "ai_error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const data = await aiRes.json();
    const pulse = data?.choices?.[0]?.message?.content?.trim() ?? "";
    return new Response(JSON.stringify({ pulse }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
