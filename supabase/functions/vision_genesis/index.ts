// Vision Genesis — Phase 7 Part 2
// Multimodal image → Universal Salsabil Asset (USA) payload via gemini-2.5-pro
// forced tool call. Returns a sanitized {asset, skus, financial_contract}.
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

const ASSET_TYPES = ["physical", "digital", "service", "rental", "milestone_project"] as const;
const PRICING_MODELS = [
  "flat",
  "tiered_wholesale",
  "subscription",
  "deposit_and_rental",
  "milestone_installments",
] as const;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON_KEY =
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ||
      Deno.env.get("SUPABASE_ANON_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "missing_key" }, 500);

    // Auth gate
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "unauthorized" }, 401);

    const { image_base64, mime_type, hint } = await req.json().catch(() => ({}));
    if (!image_base64 || typeof image_base64 !== "string") {
      return json({ error: "missing_image" }, 400);
    }
    const mt = typeof mime_type === "string" && mime_type.startsWith("image/")
      ? mime_type
      : "image/jpeg";
    const dataUrl = image_base64.startsWith("data:")
      ? image_base64
      : `data:${mt};base64,${image_base64}`;

    const systemPrompt = `أنت "حكيم Vision" — محلل مرئي خبير لـ "ريف المدينة". مهمتك تحليل الصورة (منتج، فاتورة مورد، عقد، أو منشور خدمة) واستخراج "الأصل العالمي" (Universal Salsabil Asset) كاملاً: الأصل + SKUs + العقد المالي. استخدم العربية في الأسماء والأوصاف. استنتج النوع المناسب: physical للسلع، service للخدمات، rental للإيجار، milestone_project للتشطيبات/المشاريع. اقترح traits مفيدة (مثل cold_chain, requires_calendar, fragile). إن لم يوجد سعر اقترح سعراً منطقياً للسوق المصري بالجنيه.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `حلّل هذه الصورة وأنشئ USA payload. ${hint ? `سياق إضافي: ${hint}` : ""}`,
              },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_usa_payload",
              description: "Return the Universal Salsabil Asset payload extracted from the image.",
              parameters: {
                type: "object",
                properties: {
                  asset: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      description: { type: "string" },
                      asset_type: { type: "string", enum: [...ASSET_TYPES] },
                      traits: {
                        type: "array",
                        items: { type: "string" },
                        description: "سمات مستنتجة مثل cold_chain, fragile, requires_calendar",
                      },
                    },
                    required: ["name", "description", "asset_type", "traits"],
                  },
                  skus: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        sku_code: { type: "string" },
                        attributes: {
                          type: "object",
                          additionalProperties: true,
                          description: "size, weight, color, variant, etc.",
                        },
                      },
                      required: ["sku_code", "attributes"],
                    },
                  },
                  financial_contract: {
                    type: "object",
                    properties: {
                      pricing_model: { type: "string", enum: [...PRICING_MODELS] },
                      base_price: { type: "number" },
                      currency: { type: "string", enum: ["EGP", "USD", "EUR"] },
                      contract_rules: {
                        type: "object",
                        additionalProperties: true,
                        description: "tier table, milestone splits, deposit rules",
                      },
                    },
                    required: ["pricing_model", "base_price"],
                  },
                },
                required: ["asset", "skus", "financial_contract"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_usa_payload" } },
      }),
    });

    if (aiRes.status === 429) return json({ error: "rate_limited" }, 429);
    if (aiRes.status === 402) return json({ error: "credits_exhausted" }, 402);
    if (!aiRes.ok) {
      const t = await aiRes.text();
      console.error("Vision AI error:", aiRes.status, t);
      return json({ error: "ai_error" }, 500);
    }

    const aiData = await aiRes.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    let parsed: any = {};
    try {
      parsed = JSON.parse(toolCall?.function?.arguments ?? "{}");
    } catch (e) {
      console.error("tool args parse error", e);
      return json({ error: "ai_parse_error" }, 500);
    }

    // Sanitize
    const assetType = ASSET_TYPES.includes(parsed?.asset?.asset_type)
      ? parsed.asset.asset_type
      : "physical";
    const pricingModel = PRICING_MODELS.includes(parsed?.financial_contract?.pricing_model)
      ? parsed.financial_contract.pricing_model
      : "flat";

    const sanitized = {
      asset: {
        name: String(parsed?.asset?.name ?? "أصل بدون اسم").slice(0, 200),
        description: String(parsed?.asset?.description ?? "").slice(0, 2000),
        asset_type: assetType,
        traits: Array.isArray(parsed?.asset?.traits)
          ? parsed.asset.traits.filter((t: unknown) => typeof t === "string").slice(0, 20)
          : [],
      },
      skus: Array.isArray(parsed?.skus)
        ? parsed.skus.slice(0, 20).map((s: any, i: number) => ({
            sku_code: String(s?.sku_code ?? `SKU-${Date.now()}-${i}`).slice(0, 64),
            attributes: s?.attributes && typeof s.attributes === "object" ? s.attributes : {},
          }))
        : [],
      financial_contract: {
        pricing_model: pricingModel,
        base_price: Math.max(0, Number(parsed?.financial_contract?.base_price) || 0),
        currency: ["EGP", "USD", "EUR"].includes(parsed?.financial_contract?.currency)
          ? parsed.financial_contract.currency
          : "EGP",
        contract_rules:
          parsed?.financial_contract?.contract_rules &&
          typeof parsed.financial_contract.contract_rules === "object"
            ? parsed.financial_contract.contract_rules
            : {},
      },
      generated_at: new Date().toISOString(),
    };

    return json({ ok: true, ...sanitized });
  } catch (e) {
    console.error("vision_genesis error:", e);
    return json({ error: e instanceof Error ? e.message : "unknown" }, 500);
  }
});
