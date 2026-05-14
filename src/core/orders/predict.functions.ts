/**
 * Predict Basket — Sovereign Server Function (Wave P-4.2).
 * Replaces the `predict_basket` Supabase Edge Function. Caller's identity
 * is taken from the validated bearer token via `requireSupabaseAuth`;
 * service-role admin client is used for the materialized view + product hydration.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { asDynamic } from "@/integrations/supabase/dynamic";

type FreqRow = {
  product_id: string;
  qty_total?: number | null;
  order_count?: number | null;
  last_ordered_at?: string | null;
  avg_interval_days?: number | null;
};

type ProductRow = {
  id: string;
  name: string;
  unit: string;
  category: string;
  price: number | string;
  image?: string | null;
  image_url?: string | null;
};

type AiToolCall = {
  function?: { arguments?: string };
};

type AiResponse = {
  choices?: Array<{ message?: { tool_calls?: AiToolCall[] } }>;
};

const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

const sb = asDynamic(supabaseAdmin);

export const predictBasketFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const userId = context.userId;
    const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
    if (!LOVABLE_API_KEY) return { error: "ai_error" as const };

    const { data: freqRows, error: freqErr } = await sb
      .from("user_product_frequency")
      .select("product_id, qty_total, order_count, last_ordered_at, avg_interval_days")
      .eq("user_id", userId)
      .order("qty_total", { ascending: false })
      .order("last_ordered_at", { ascending: false })
      .limit(30);

    const empty = {
      ok: true as const,
      empty: true,
      headline: "ابدأ التسوق لتظهر سلتك الذكية",
      confidence: 0,
      basket: [],
    };

    if (freqErr) {
      const code = (freqErr as { code?: string }).code;
      if (code === "PGRST205" || code === "42P01") return empty;
      return { error: "freq_query_failed" as const };
    }
    if (!freqRows || freqRows.length === 0) return empty;

    const productIds = (freqRows as Array<{ product_id: string }>).map((r) => r.product_id);
    const { data: products, error: prodErr } = await sb
      .from("products")
      .select("id,name,price,unit,category,image,image_url")
      .in("id", productIds)
      .eq("is_active", true);

    if (prodErr) {
      const code = (prodErr as { code?: string }).code;
      if (code === "PGRST205" || code === "42P01") return empty;
      return { error: "products_query_failed" as const };
    }

    const productsTyped = ((products ?? []) as unknown) as ProductRow[];
    const freqTyped = (freqRows as unknown) as FreqRow[];
    const productById = new Map(productsTyped.map((p) => [p.id, p] as const));
    const candidates = freqTyped
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
      return { ...empty, headline: "لا توجد منتجات مرشحة لسلة الحكيم بعد" };
    }

    const systemPrompt = `أنت "حكيم" — مساعد التسوق الذكي لـ "ريف المدينة". مهمتك اقتراح سلة أسبوعية متكاملة من المنتجات التي يشتريها العميل بانتظام. اختر 4-8 منتجات فقط، واضبط الكميات حسب متوسط الاستهلاك. اكتب عناوين وتفسيرات مختصرة بالعربية.`;
    const userPrompt = `سجل شراء العميل (المرشحون):\n${JSON.stringify(candidates, null, 2)}\n\nاقترح سلة الأسبوع المثلى. استخدم فقط product_id من القائمة أعلاه.`;

    const aiRes = await fetch(AI_GATEWAY, {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
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

    if (aiRes.status === 429) return { error: "rate_limited" as const };
    if (aiRes.status === 402) return { error: "credits_exhausted" as const };
    if (!aiRes.ok) return { error: "ai_error" as const };

    const aiData = (await aiRes.json()) as AiResponse;
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    let parsed: {
      headline?: string;
      confidence?: number;
      basket?: Array<{ product_id: string; quantity: number; reason: string }>;
    } = {};
    if (toolCall?.function?.arguments) {
      try { parsed = JSON.parse(toolCall.function.arguments); } catch { /* noop */ }
    }

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

    return {
      ok: true as const,
      headline: parsed.headline || "سلة الحكيم الأسبوعية",
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.7,
      basket: sanitized,
      generated_at: new Date().toISOString(),
    };
  });
