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

    const systemPrompt = `أنت "حكيم Vision" — قشرة استخراج الـ Product DNA لـ "ريف المدينة". مهمتك تحليل الصورة (منتج، فاتورة مورد، عقد، أو منشور خدمة) واستخراج "الأصل العالمي" (Universal Salsabil Asset) الكامل: الأصل + SKUs + العقد المالي.

قواعد صارمة:
1. استخرج كل تفصيلة ممكنة بصرياً (اسم، علامة تجارية، باركود، وزن صافي، حقائق غذائية، مكونات، مسببات حساسية، بلد المنشأ).
2. إذا لم يكن الحقل مرئياً أو لا يمكن استنتاجه بثقة عالية — اتركه null. لا تخمّن أرقاماً غذائية أو وزناً.
3. اكتب جميع الأوصاف والمحتوى التسويقي بالعربية الفصحى الاحترافية.
4. استنتج أدق category_path هرمي بصيغة "قسم/فئة/فئة فرعية" (مثال: "بقالة/منتجات الألبان/جبن").
5. اقترح traits مفيدة مثل cold_chain, fragile, requires_calendar, halal_certified.
6. حدد النوع: physical للسلع، service للخدمات، rental للإيجار، milestone_project للتشطيبات.
7. إن لم يوجد سعر، اقترح سعراً منطقياً للسوق المصري بالجنيه (EGP).`;

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
                text: `حلّل هذه الصورة واستخرج الـ Product DNA الكامل. ${hint ? `سياق إضافي: ${hint}` : ""}`,
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
              description: "Return the full Universal Salsabil Asset Product DNA payload extracted from the image.",
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
                        description: "سمات مستنتجة مثل cold_chain, fragile, halal_certified",
                      },
                      category_path: {
                        type: ["string", "null"],
                        description: "مسار الفئة الهرمي مثل 'بقالة/ألبان/جبن'",
                      },
                      brand: { type: ["string", "null"], description: "العلامة التجارية إن ظهرت" },
                      origin_country: { type: ["string", "null"], description: "بلد المنشأ" },
                      marketing: {
                        type: ["object", "null"],
                        properties: {
                          short: { type: ["string", "null"], description: "وصف تسويقي قصير (≤140 حرف) بالعربية" },
                          long: { type: ["string", "null"], description: "وصف تسويقي مطوّل بالعربية" },
                        },
                      },
                      nutrition: {
                        type: ["object", "null"],
                        description: "حقائق غذائية لكل 100 جم/مل إن ظهرت على العبوة",
                        properties: {
                          kcal: { type: ["number", "null"] },
                          protein_g: { type: ["number", "null"] },
                          fat_g: { type: ["number", "null"] },
                          carbs_g: { type: ["number", "null"] },
                          sugar_g: { type: ["number", "null"] },
                        },
                      },
                      physical: {
                        type: ["object", "null"],
                        properties: {
                          net_weight: { type: ["number", "null"], description: "الوزن/الحجم الصافي" },
                          weight_unit: {
                            type: ["string", "null"],
                            enum: ["g", "kg", "ml", "L", "piece", null],
                            description: "وحدة الوزن/الحجم",
                          },
                        },
                      },
                      allergens: {
                        type: ["array", "null"],
                        items: { type: "string" },
                        description: "مسببات الحساسية مثل gluten, milk, nuts, soy",
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
                        barcode: {
                          type: ["string", "null"],
                          description: "EAN/UPC barcode إن قُرئ من الصورة",
                        },
                        variant_axes: {
                          type: ["object", "null"],
                          properties: {
                            size: { type: ["string", "null"] },
                            flavor: { type: ["string", "null"] },
                          },
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

    const optStr = (v: unknown, max = 500): string | null =>
      typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null;
    const optNum = (v: unknown): number | null =>
      typeof v === "number" && Number.isFinite(v) ? v : null;
    const optStrArr = (v: unknown, max = 20): string[] | null =>
      Array.isArray(v)
        ? v.filter((x) => typeof x === "string").slice(0, max)
        : null;

    const a = parsed?.asset ?? {};
    const marketing = a?.marketing && typeof a.marketing === "object"
      ? { short: optStr(a.marketing.short, 200), long: optStr(a.marketing.long, 2000) }
      : null;
    const nutrition = a?.nutrition && typeof a.nutrition === "object"
      ? {
          kcal: optNum(a.nutrition.kcal),
          protein_g: optNum(a.nutrition.protein_g),
          fat_g: optNum(a.nutrition.fat_g),
          carbs_g: optNum(a.nutrition.carbs_g),
          sugar_g: optNum(a.nutrition.sugar_g),
        }
      : null;
    const physical = a?.physical && typeof a.physical === "object"
      ? {
          net_weight: optNum(a.physical.net_weight),
          weight_unit: ["g", "kg", "ml", "L", "piece"].includes(a.physical.weight_unit)
            ? a.physical.weight_unit
            : null,
        }
      : null;

    const sanitized = {
      asset: {
        name: String(a?.name ?? "أصل بدون اسم").slice(0, 200),
        description: String(a?.description ?? "").slice(0, 2000),
        asset_type: assetType,
        traits: Array.isArray(a?.traits)
          ? a.traits.filter((t: unknown) => typeof t === "string").slice(0, 20)
          : [],
        category_path: optStr(a?.category_path, 200),
        brand: optStr(a?.brand, 120),
        origin_country: optStr(a?.origin_country, 80),
        marketing,
        nutrition,
        physical,
        allergens: optStrArr(a?.allergens, 20),
      },
      skus: Array.isArray(parsed?.skus)
        ? parsed.skus.slice(0, 20).map((s: any, i: number) => ({
            sku_code: String(s?.sku_code ?? `SKU-${Date.now()}-${i}`).slice(0, 64),
            attributes: s?.attributes && typeof s.attributes === "object" ? s.attributes : {},
            barcode: optStr(s?.barcode, 64),
            variant_axes: s?.variant_axes && typeof s.variant_axes === "object"
              ? {
                  size: optStr(s.variant_axes.size, 64),
                  flavor: optStr(s.variant_axes.flavor, 64),
                }
              : null,
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
      prompt_version: "v1-rich-dna",
      generated_at: new Date().toISOString(),
    };

    // ── Generative Aesthetics Layer ─────────────────────────────────────
    // Re-render the cropped subject onto a category-aware pastel backdrop
    // so storefront cards never expose a raw cutout. Server-side only,
    // returns a single optimized 2D image (Article 1.2 — Ghostly Payload).
    let aestheticImage: string | null = null;
    let aestheticPalette: { name: string; hex: string } | null = null;
    try {
      aestheticPalette = pickPalette(sanitized.asset.category_path, sanitized.asset.traits);
      const prompt = `Professional, photorealistic commercial product shot of "${sanitized.asset.name}" placed in a clean, minimalist environment with a soft, matte ${aestheticPalette.name} pastel background (${aestheticPalette.hex}). Soft diffused studio lighting from the upper-left. Realistic soft drop shadow beneath the product for depth. Centered composition, square framing, e-commerce catalog style, extremely high quality, professional photography. Do not alter the product itself — preserve labels, colors, and proportions exactly.`;
      const imgRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
                { type: "text", text: prompt },
                { type: "image_url", image_url: { url: dataUrl } },
              ],
            },
          ],
          modalities: ["image", "text"],
        }),
      });
      if (imgRes.ok) {
        const d = await imgRes.json();
        const url: string | undefined =
          d?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
        if (typeof url === "string" && url.startsWith("data:image/")) {
          aestheticImage = url;
        }
      } else {
        console.warn("aesthetics skipped", imgRes.status);
      }
    } catch (e) {
      console.warn("aesthetics error", e);
    }

    return json({
      ok: true,
      ...sanitized,
      aesthetic_image_data_url: aestheticImage,
      aesthetic_palette: aestheticPalette,
    });
  } catch (e) {
    console.error("vision_genesis error:", e);
    return json({ error: e instanceof Error ? e.message : "unknown" }, 500);
  }
});
