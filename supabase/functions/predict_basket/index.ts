// Hakim Predictive Cart — predict_basket edge function (Phase 5)
// ----------------------------------------------------------------
// Reads the per-user purchase frequency materialized view, asks
// google/gemini-2.5-flash (via Lovable AI Gateway) to propose a
// recurring basket via a forced tool call, sanitizes hallucinated
// product_ids out, and returns a structured suggestion.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY =
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ||
      Deno.env.get("SUPABASE_ANON_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

    // --- Auth: derive user_id from caller's JWT, never trust the body ---
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "unauthorized" }, 401);
    const userId = userData.user.id;

    // --- Data: top-N frequency rows + hydrate products via service role ---
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: freqRows, error: freqErr } = await admin
      .from("user_product_frequency")
      .select("product_id, qty_total, order_count, last_ordered_at, avg_interval_days")
      .eq("user_id", userId)
      .order("qty_total", { ascending: false })
      .order("last_ordered_at", { ascending: false })
      .limit(30);

    if (freqErr) {
      console.error("freq query error:", freqErr);
      return json({ error: "freq_query_failed" }, 500);
    }
    if (!freqRows || freqRows.length === 0) {
      return json({
        ok: true,
        empty: true,
        headline: "ابدأ التسوق لتظهر سلتك الذكية",
        confidence: 0,
        basket: [],
      });
    }

    const productIds = freqRows.map((r) => r.product_id);
    const { data: products, error: prodErr } = await admin
      .from("products")
      .select("id,name,price,unit,category,image,image_url")
      .in("id", productIds)
      .eq("is_active", true);

    if (prodErr) {
      console.error("products query error:", prodErr);
      return json({ error: "products_query_failed" }, 500);
    }

    const productById = new Map(
      (products ?? []).map((p) => [p.id, p] as const),
    );
    const candidates = freqRows
      .filter((r) => productById.has(r.product_id))
      .map((r) => {
        const p = productById.get(r.product_id)!;
        return {
          product_id: p.id,
          name: p.name,
          unit: p.unit,
          category: p.category,
          price: Number(p.price),
          qty_total: Number(r.qty_total ?? 0),
          order_count: Number(r.order_count ?? 0),
          avg_interval_days: r.avg_interval_days != null ? Number(r.avg_interval_days) : null,
          last_ordered_at: r.last_ordered_at,
        };
      });

    if (candidates.length === 0) {
      return json({
        ok: true,
        empty: true,
        headline: "لا توجد منتجات مرشحة لسلة الحكيم بعد",
        confidence: 0,
        basket: [],
      });
    }

    // --- AI: forced tool call for structured output ---
    const systemPrompt =
      `أنت "حكيم" — مساعد التسوق الذكي لـ "ريف المدينة". مهمتك اقتراح سلة أسبوعية متكاملة من المنتجات التي يشتريها العميل بانتظام. اختر 4-8 منتجات فقط، واضبط الكميات حسب متوسط الاستهلاك. اكتب عناوين وتفسيرات مختصرة بالعربية.`;
    const userPrompt = `سجل شراء العميل (المرشحون):\n${JSON.stringify(candidates, null, 2)}\n\nاقترح سلة الأسبوع المثلى. استخدم فقط product_id من القائمة أعلاه.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "propose_basket",
              description: "Return the recommended weekly basket for this user.",
              parameters: {
                type: "object",
                properties: {
                  headline: { type: "string", description: "عنوان عربي مختصر للسلة" },
                  confidence: { type: "number", description: "ثقة من 0 إلى 1" },
                  basket: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        product_id: { type: "string" },
                        quantity: { type: "number" },
                        reason: { type: "string" },
                      },
                      required: ["product_id", "quantity", "reason"],
                    },
                  },
                },
                required: ["headline", "confidence", "basket"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "propose_basket" } },
      }),
    });

    if (aiRes.status === 429) return json({ error: "rate_limited" }, 429);
    if (aiRes.status === 402) return json({ error: "credits_exhausted" }, 402);
    if (!aiRes.ok) {
      const t = await aiRes.text();
      console.error("AI error:", aiRes.status, t);
      return json({ error: "ai_error" }, 500);
    }

    const aiData = await aiRes.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    let parsed: {
      headline?: string;
      confidence?: number;
      basket?: Array<{ product_id: string; quantity: number; reason: string }>;
    } = {};
    if (toolCall?.function?.arguments) {
      try {
        parsed = JSON.parse(toolCall.function.arguments);
      } catch (e) {
        console.error("tool args parse error", e);
      }
    }

    // --- Anti-hallucination: drop unknown product_ids ---
    const validIds = new Set(candidates.map((c) => c.product_id));
    const sanitized = (parsed.basket ?? [])
      .filter((b) => b && validIds.has(b.product_id))
      .map((b) => {
        const p = productById.get(b.product_id)!;
        const qty = Math.max(1, Math.min(20, Math.round(Number(b.quantity) || 1)));
        return {
          product_id: b.product_id,
          quantity: qty,
          reason: String(b.reason ?? ""),
          name: p.name,
          unit: p.unit,
          price: Number(p.price),
          image: p.image_url || p.image || null,
          category: p.category,
        };
      });

    return json({
      ok: true,
      headline: parsed.headline || "سلة الحكيم الأسبوعية",
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.7,
      basket: sanitized,
      generated_at: new Date().toISOString(),
    });
  } catch (e) {
    console.error("predict_basket error:", e);
    return json({ error: e instanceof Error ? e.message : "unknown" }, 500);
  }
});
