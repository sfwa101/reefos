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

// ── Generative Aesthetics: category → soft pastel palette ─────────────
const PALETTES: Array<{ name: string; hex: string }> = [
  { name: "mint green", hex: "#D1FAE5" },
  { name: "warm cream", hex: "#FEF3C7" },
  { name: "blush pink", hex: "#FCE7F3" },
  { name: "powder blue", hex: "#DBEAFE" },
  { name: "soft lavender", hex: "#EDE9FE" },
  { name: "sand beige", hex: "#F5F1E8" },
  { name: "sage", hex: "#E2E8DD" },
];
function pickPalette(category: string | null, traits: string[]): { name: string; hex: string } {
  const c = (category ?? "").toLowerCase();
  const t = traits.map((x) => x.toLowerCase()).join(" ");
  const blob = `${c} ${t}`;
  if (/خضار|vegetable|herb|عشب|salad/.test(blob)) return PALETTES[0];
  if (/فاكهة|fruit|berry|توت/.test(blob)) return PALETTES[2];
  if (/لحوم|meat|دواجن|poultry|سمك|fish|seafood/.test(blob)) return PALETTES[5];
  if (/ألبان|dairy|cheese|جبن|milk|حليب|yogurt|زبادي/.test(blob)) return PALETTES[3];
  if (/مخبوزات|bakery|خبز|bread|pastry|حلوى|sweet|dessert/.test(blob)) return PALETTES[1];
  if (/مشروب|beverage|drink|juice|عصير|water|مياه|tea|شاي|coffee|قهوة/.test(blob)) return PALETTES[3];
  if (/تجميل|beauty|cosmetic|عناية|skincare|بشرة/.test(blob)) return PALETTES[4];
  if (/تنظيف|clean|detergent|منظف|household/.test(blob)) return PALETTES[6];
  if (/زيت|oil|سمن|ghee|تتبيلة|condiment|sauce|صلصة/.test(blob)) return PALETTES[5];
  // hash fallback for stable variety
  let h = 0;
  for (const ch of blob) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return PALETTES[h % PALETTES.length];
}
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON_KEY =
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ||
      Deno.env.get("SUPABASE_ANON_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return json({
        error: "MISSING_API_KEY",
        details: "LOVABLE_API_KEY is not configured in Edge Function secrets.",
      }, 500);
    }

    // Auth gate
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "unauthorized" }, 401);

    // Phase C-4 — Safe Base64 Restoration.
    // The browser's Universal Compression Engine guarantees each payload is
    // ≤ ~150 KB (1024px max edge, WebP q≈0.8). At that size, inline base64
    // round-trips through Deno safely (no OOM), and the AI Gateway accepts
    // the data: URL natively (no Storage URL rejection).
    const body = await req.json().catch(() => ({}));
    const {
      image_base64,
      secondary_image_base64,
      images_base64, // forward-compat array form
      hint,
    } = body ?? {};

    const datas: string[] = Array.isArray(images_base64)
      ? images_base64.filter((u: unknown): u is string => typeof u === "string" && u.length > 0).slice(0, 4)
      : [
          ...(typeof image_base64 === "string" && image_base64.length > 0 ? [image_base64] : []),
          ...(typeof secondary_image_base64 === "string" && secondary_image_base64.length > 0
            ? [secondary_image_base64]
            : []),
        ];

    if (datas.length === 0) {
      return json({ error: "missing_image", details: "image_base64 is required" }, 400);
    }

    // Hard ceiling — anything larger than ~600 KB per image means the client
    // bypassed the Compression Engine. Reject fast instead of risking OOM.
    const MAX_DATA_URL_BYTES = 600 * 1024;
    const DATA_URL_RE = /^data:image\/(jpeg|jpg|png|webp|gif);base64,[A-Za-z0-9+/=]+$/;
    for (const d of datas) {
      if (!DATA_URL_RE.test(d)) {
        return json({ error: "invalid_image", details: "image must be a data:image/* base64 URL" }, 400);
      }
      if (d.length > MAX_DATA_URL_BYTES) {
        return json({
          error: "invalid_image",
          details: `image_too_large:${d.length} (compress client-side, max ${MAX_DATA_URL_BYTES})`,
        }, 400);
      }
    }

    const primaryUrl = datas[0];
    const secondaryUrl = datas.length > 1 ? datas[1] : null;

    const systemPrompt = `أنت "حكيم Vision" — قشرة استخراج الـ Product DNA لـ "ريف المدينة". مهمتك تحليل الصورة (منتج، فاتورة مورد، عقد، أو منشور خدمة) واستخراج "الأصل العالمي" (Universal Salsabil Asset) الكامل: الأصل + SKUs + العقد المالي.

قواعد صارمة:
1. استخرج كل تفصيلة ممكنة بصرياً (اسم، علامة تجارية، باركود، وزن صافي، حقائق غذائية، مكونات، مسببات حساسية، بلد المنشأ).
2. للسلع المعبأة (packaged goods) ذات ملصق غذائي مطبوع: استخرج فقط ما هو مرئي ولا تخمّن. إذا لم يكن الحقل مرئياً اتركه null.
3. استثناء مهم — للأطعمة الطبيعية أو العامة (فواكه طازجة، خضروات، لحوم، أسماك، حبوب، بيض… أي صنف بلا ملصق غذائي): يجب عليك تقدير وملء القيم الغذائية القياسية المتعارف عليها لكل 100جم (kcal, protein_g, carbs_g, fat_g, sugar_g) بناءً على المعرفة العامة. لا تتركها null في هذه الحالة.
4. اكتب جميع الأوصاف والمحتوى التسويقي بالعربية الفصحى الاحترافية.
5. يجب دائماً اقتراح category_path هرمي بصيغة "قسم > فئة > فئة فرعية" (مثال: "خضار وفواكه > فواكه صيفية" أو "بقالة > منتجات الألبان > جبن"). لا تتركه فارغاً أبداً.
6. اقترح traits مفيدة مثل cold_chain, fragile, requires_calendar, halal_certified, loose_weight (للمنتجات السائبة كالفواكه والخضار).
7. حدد النوع: physical للسلع، service للخدمات، rental للإيجار، milestone_project للتشطيبات.
8. إن لم يوجد سعر، اقترح سعراً منطقياً للسوق المصري بالجنيه (EGP).`;

    const visionPayload = {
      model: "google/gemini-2.5-pro",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `حلّل ${secondaryUrl ? "الصورتين معاً (الأولى = واجهة المنتج، الثانية = ظهر العبوة/ملصق الحقائق الغذائية)" : "هذه الصورة"} واستخرج الـ Product DNA الكامل. ${hint ? `سياق إضافي: ${hint}` : ""}`,
            },
            { type: "image_url", image_url: { url: primaryUrl } },
            ...(secondaryUrl
              ? [{ type: "image_url", image_url: { url: secondaryUrl } }]
              : []),
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
    };

    console.error("[C3][vision_genesis] AI Gateway request", JSON.stringify({
      endpoint: "https://ai.gateway.lovable.dev/v1/chat/completions",
      model: visionPayload.model,
      imageTransport: "raw_https_url",
      imageCount: urls.length,
      primaryUrl,
      secondaryUrl,
      payload: visionPayload,
    }));

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(visionPayload),
    });

    const aiText = await aiRes.text();
    console.error("[C3][vision_genesis] AI Gateway response", JSON.stringify({
      status: aiRes.status,
      ok: aiRes.ok,
      contentType: aiRes.headers.get("content-type"),
      body: aiText,
    }));

    if (aiRes.status === 429) return json({ error: "rate_limited", details: "AI gateway rate limit hit (429)." }, 429);
    if (aiRes.status === 402) return json({ error: "credits_exhausted", details: "AI gateway credits exhausted (402)." }, 402);
    if (!aiRes.ok) {
      // Phase C-2 — bubble the upstream body verbatim. No truncation, no wrapping.
      console.error("Vision AI error:", aiRes.status, aiText);
      let upstream: unknown = aiText;
      try { upstream = JSON.parse(aiText); } catch { /* keep as text */ }
      return json({
        error: "AI_API_ERROR",
        status: aiRes.status,
        upstream,
      }, aiRes.status);
    }

    let aiData: any;
    try {
      aiData = JSON.parse(aiText);
    } catch (e) {
      console.error("[C3][vision_genesis] AI Gateway non-JSON success body", aiText);
      return json({
        error: "AI_NON_JSON_RESPONSE",
        details: e instanceof Error ? e.message : String(e),
        upstream: aiText,
      }, 500);
    }
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      const fallbackMsg = aiData.choices?.[0]?.message?.content ?? JSON.stringify(aiData).slice(0, 500);
      console.error("no tool_call returned", fallbackMsg);
      return json({ error: "AI_NO_TOOL_CALL", details: String(fallbackMsg).slice(0, 800) }, 500);
    }
    let parsed: any = {};
    try {
      parsed = JSON.parse(toolCall?.function?.arguments ?? "{}");
    } catch (e) {
      console.error("tool args parse error", e);
      return json({
        error: "PARSE_ERROR",
        details: e instanceof Error ? e.message : String(e),
        raw: String(toolCall?.function?.arguments ?? "").slice(0, 500),
      }, 500);
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
                { type: "image_url", image_url: { url: primaryUrl } },
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
    const msg = e instanceof Error ? e.message : String(e);
    return json({ error: "UNHANDLED", details: msg, stack: e instanceof Error ? e.stack?.slice(0, 600) : undefined }, 500);
  }
});
