// Vision Genesis — Phase C-4 · Universal Independence Protocol
// Multi-provider sovereign router: Gemini (native), OpenRouter, DeepSeek.
// Standardized output: { ok, asset, skus, financial_contract, ... }
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

type Provider = "gemini" | "openrouter" | "deepseek";

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
  let h = 0;
  for (const ch of blob) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return PALETTES[h % PALETTES.length];
}

const SYSTEM_PROMPT = `أنت "حكيم Vision" — قشرة استخراج الـ Product DNA لـ "ريف المدينة". مهمتك تحليل الصورة (منتج، فاتورة مورد، عقد، أو منشور خدمة) واستخراج "الأصل العالمي" (Universal Salsabil Asset) الكامل: الأصل + SKUs + العقد المالي.

قواعد صارمة:
1. استخرج كل تفصيلة ممكنة بصرياً (اسم، علامة تجارية، باركود، وزن صافي، حقائق غذائية، مكونات، مسببات حساسية، بلد المنشأ).
2. للسلع المعبأة (packaged goods) ذات ملصق غذائي مطبوع: استخرج فقط ما هو مرئي ولا تخمّن. إذا لم يكن الحقل مرئياً اتركه null.
3. استثناء مهم — للأطعمة الطبيعية أو العامة (فواكه طازجة، خضروات، لحوم، أسماك، حبوب، بيض): يجب عليك تقدير وملء القيم الغذائية القياسية لكل 100جم بناءً على المعرفة العامة.
4. اكتب جميع الأوصاف والمحتوى التسويقي بالعربية الفصحى الاحترافية.
5. يجب دائماً اقتراح category_path هرمي بصيغة "قسم > فئة > فئة فرعية".
6. اقترح traits مفيدة مثل cold_chain, fragile, requires_calendar, halal_certified, loose_weight.
7. حدد النوع: physical للسلع، service للخدمات، rental للإيجار، milestone_project للتشطيبات.
8. إن لم يوجد سعر، اقترح سعراً منطقياً للسوق المصري بالجنيه (EGP).`;

// ─── Tool Schema (shared shape) ───────────────────────────────────────
const TOOL_PARAMETERS = {
  type: "object",
  properties: {
    asset: {
      type: "object",
      properties: {
        name: { type: "string" },
        description: { type: "string" },
        asset_type: { type: "string", enum: [...ASSET_TYPES] },
        traits: { type: "array", items: { type: "string" } },
        category_path: { type: ["string", "null"] },
        brand: { type: ["string", "null"] },
        origin_country: { type: ["string", "null"] },
        marketing: {
          type: ["object", "null"],
          properties: {
            short: { type: ["string", "null"] },
            long: { type: ["string", "null"] },
          },
        },
        nutrition: {
          type: ["object", "null"],
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
            net_weight: { type: ["number", "null"] },
            weight_unit: { type: ["string", "null"], enum: ["g", "kg", "ml", "L", "piece", null] },
          },
        },
        allergens: { type: ["array", "null"], items: { type: "string" } },
      },
      required: ["name", "description", "asset_type", "traits"],
    },
    skus: {
      type: "array",
      items: {
        type: "object",
        properties: {
          sku_code: { type: "string" },
          attributes: { type: "object", additionalProperties: true },
          barcode: { type: ["string", "null"] },
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
        contract_rules: { type: "object", additionalProperties: true },
      },
      required: ["pricing_model", "base_price"],
    },
  },
  required: ["asset", "skus", "financial_contract"],
} as const;

// ─── Provider invocations ─────────────────────────────────────────────
// All return: { parsed: any } or throw an Error with .status
type ProviderResult = { parsed: unknown; raw?: unknown };

function dataUrlParts(dataUrl: string): { mime: string; b64: string } {
  // data:image/<mime>;base64,<b64>
  const m = /^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/.exec(dataUrl);
  if (!m) throw new Error("invalid_data_url");
  return { mime: m[1], b64: m[2] };
}

// Convert JSON-Schema (with `type: ["X","null"]`) to Gemini OpenAPI 3 schema
// (single `type` + `nullable: true`). Also strips `null` from enums and drops
// unsupported keywords like `additionalProperties`.
function toGeminiSchema(node: any): any {
  if (Array.isArray(node)) return node.map(toGeminiSchema);
  if (!node || typeof node !== "object") return node;
  const out: any = {};
  for (const [k, v] of Object.entries(node)) {
    if (k === "additionalProperties") continue; // unsupported by Gemini
    if (k === "type" && Array.isArray(v)) {
      const nonNull = v.filter((t) => t !== "null");
      out.type = (nonNull[0] ?? "string");
      if (v.includes("null")) out.nullable = true;
    } else if (k === "enum" && Array.isArray(v)) {
      const cleaned = v.filter((x) => x !== null);
      if (cleaned.length) out.enum = cleaned;
      if (v.includes(null)) out.nullable = true;
    } else if (k === "properties" && v && typeof v === "object") {
      const props: Record<string, any> = {};
      for (const [pk, pv] of Object.entries(v as Record<string, any>)) {
        props[pk] = toGeminiSchema(pv);
      }
      out.properties = props;
    } else if (k === "items") {
      out.items = toGeminiSchema(v);
    } else {
      out[k] = toGeminiSchema(v);
    }
  }
  // Gemini requires `type` on every schema node; default to "string".
  if (!("type" in out) && !("properties" in out) && !("enum" in out)) {
    // leave as-is
  }
  return out;
}

async function callGemini(opts: {
  apiKey: string;
  primary: string;
  secondary: string | null;
  hint?: string;
}): Promise<ProviderResult> {
  const { apiKey, primary, secondary, hint } = opts;
  const parts: any[] = [
    {
      text: `حلّل ${secondary ? "الصورتين معاً (الأولى = واجهة المنتج، الثانية = ظهر العبوة/ملصق الحقائق الغذائية)" : "هذه الصورة"} واستخرج الـ Product DNA الكامل. ${hint ? `سياق إضافي: ${hint}` : ""}`,
    },
  ];
  for (const url of [primary, ...(secondary ? [secondary] : [])]) {
    const { mime, b64 } = dataUrlParts(url);
    parts.push({ inlineData: { mimeType: mime, data: b64 } });
  }

  const body = {
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [{ role: "user", parts }],
    tools: [
      {
        functionDeclarations: [
          {
            name: "generate_usa_payload",
            description: "Return the full Universal Salsabil Asset Product DNA payload.",
            parameters: toGeminiSchema(TOOL_PARAMETERS),
          },
        ],
      },
    ],
    toolConfig: {
      functionCallingConfig: { mode: "ANY", allowedFunctionNames: ["generate_usa_payload"] },
    },
  };

  const url =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=" +
    encodeURIComponent(apiKey);
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) {
    const err = new Error(`gemini_${res.status}: ${text.slice(0, 500)}`);
    (err as any).status = res.status;
    throw err;
  }
  const data = JSON.parse(text);
  const fnCall =
    data?.candidates?.[0]?.content?.parts?.find((p: any) => p?.functionCall)?.functionCall;
  if (!fnCall?.args) {
    throw new Error("gemini_no_function_call: " + JSON.stringify(data).slice(0, 500));
  }
  return { parsed: fnCall.args, raw: data };
}

async function callOpenAICompatible(opts: {
  endpoint: string;
  apiKey: string;
  model: string;
  primary: string;
  secondary: string | null;
  hint?: string;
  providerLabel: string;
}): Promise<ProviderResult> {
  const { endpoint, apiKey, model, primary, secondary, hint, providerLabel } = opts;
  const userContent: any[] = [
    {
      type: "text",
      text: `حلّل ${secondary ? "الصورتين معاً" : "هذه الصورة"} واستخرج الـ Product DNA الكامل. ${hint ? `سياق إضافي: ${hint}` : ""}`,
    },
    { type: "image_url", image_url: { url: primary } },
    ...(secondary ? [{ type: "image_url", image_url: { url: secondary } }] : []),
  ];
  const payload = {
    model,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userContent },
    ],
    tools: [
      {
        type: "function",
        function: {
          name: "generate_usa_payload",
          description: "Return the full Universal Salsabil Asset Product DNA payload.",
          parameters: TOOL_PARAMETERS,
        },
      },
    ],
    tool_choice: { type: "function", function: { name: "generate_usa_payload" } },
  };
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  if (!res.ok) {
    const err = new Error(`${providerLabel}_${res.status}: ${text.slice(0, 500)}`);
    (err as any).status = res.status;
    throw err;
  }
  const data = JSON.parse(text);
  const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall?.function?.arguments) {
    throw new Error(`${providerLabel}_no_tool_call: ` + JSON.stringify(data).slice(0, 500));
  }
  return { parsed: JSON.parse(toolCall.function.arguments), raw: data };
}

async function invokeProvider(
  provider: Provider,
  primary: string,
  secondary: string | null,
  hint: string | undefined,
): Promise<ProviderResult> {
  if (provider === "gemini") {
    const key = Deno.env.get("Gemini");
    if (!key) throw new Error("missing_key:Gemini");
    return callGemini({ apiKey: key, primary, secondary, hint });
  }
  if (provider === "openrouter") {
    const key = Deno.env.get("OpenRouter");
    if (!key) throw new Error("missing_key:OpenRouter");
    return callOpenAICompatible({
      endpoint: "https://openrouter.ai/api/v1/chat/completions",
      apiKey: key,
      model: "google/gemini-2.5-pro",
      primary,
      secondary,
      hint,
      providerLabel: "openrouter",
    });
  }
  if (provider === "deepseek") {
    const key = Deno.env.get("DeepSeek");
    if (!key) throw new Error("missing_key:DeepSeek");
    return callOpenAICompatible({
      endpoint: "https://api.deepseek.com/v1/chat/completions",
      apiKey: key,
      model: "deepseek-chat",
      primary,
      secondary,
      hint,
      providerLabel: "deepseek",
    });
  }
  throw new Error("unknown_provider");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON_KEY =
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY")!;

    // Auth gate
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const {
      image_base64,
      secondary_image_base64,
      images_base64,
      hint,
      provider: requestedProvider,
    } = body ?? {};

    const datas: string[] = Array.isArray(images_base64)
      ? images_base64
          .filter((u: unknown): u is string => typeof u === "string" && u.length > 0)
          .slice(0, 4)
      : [
          ...(typeof image_base64 === "string" && image_base64.length > 0 ? [image_base64] : []),
          ...(typeof secondary_image_base64 === "string" && secondary_image_base64.length > 0
            ? [secondary_image_base64]
            : []),
        ];

    if (datas.length === 0)
      return json({ error: "missing_image", details: "image_base64 is required" }, 400);

    const MAX_DATA_URL_BYTES = 600 * 1024;
    const DATA_URL_RE = /^data:image\/(jpeg|jpg|png|webp|gif);base64,[A-Za-z0-9+/=]+$/;
    for (const d of datas) {
      if (!DATA_URL_RE.test(d))
        return json({ error: "invalid_image", details: "image must be a data:image/* base64 URL" }, 400);
      if (d.length > MAX_DATA_URL_BYTES)
        return json(
          {
            error: "invalid_image",
            details: `image_too_large:${d.length} (compress client-side, max ${MAX_DATA_URL_BYTES})`,
          },
          400,
        );
    }

    const primaryUrl = datas[0];
    const secondaryUrl = datas.length > 1 ? datas[1] : null;

    // Provider selection — default Gemini, failover to OpenRouter.
    const allowed: Provider[] = ["gemini", "openrouter", "deepseek"];
    const primary: Provider = allowed.includes(requestedProvider) ? requestedProvider : "gemini";
    const failoverChain: Provider[] =
      primary === "gemini" ? ["gemini", "openrouter"] : [primary];

    let parsed: any = null;
    let usedProvider: Provider | null = null;
    const attempts: Array<{ provider: Provider; ok: boolean; error?: string }> = [];

    for (const p of failoverChain) {
      try {
        console.log(`[C4][vision_genesis] invoking provider=${p}`);
        const result = await invokeProvider(p, primaryUrl, secondaryUrl, hint);
        parsed = result.parsed;
        usedProvider = p;
        attempts.push({ provider: p, ok: true });
        break;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`[C4][vision_genesis] provider=${p} failed:`, msg);
        attempts.push({ provider: p, ok: false, error: msg });
      }
    }

    if (!parsed || !usedProvider) {
      return json({ error: "AI_API_ERROR", details: "all providers failed", attempts }, 502);
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
      Array.isArray(v) ? v.filter((x) => typeof x === "string").slice(0, max) : null;

    const a = parsed?.asset ?? {};
    const marketing =
      a?.marketing && typeof a.marketing === "object"
        ? { short: optStr(a.marketing.short, 200), long: optStr(a.marketing.long, 2000) }
        : null;
    const nutrition =
      a?.nutrition && typeof a.nutrition === "object"
        ? {
            kcal: optNum(a.nutrition.kcal),
            protein_g: optNum(a.nutrition.protein_g),
            fat_g: optNum(a.nutrition.fat_g),
            carbs_g: optNum(a.nutrition.carbs_g),
            sugar_g: optNum(a.nutrition.sugar_g),
          }
        : null;
    const physical =
      a?.physical && typeof a.physical === "object"
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
            variant_axes:
              s?.variant_axes && typeof s.variant_axes === "object"
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
      prompt_version: "v2-multi-provider",
      provider: usedProvider,
      provider_attempts: attempts,
      generated_at: new Date().toISOString(),
    };

    // Aesthetic palette (no external image generation in sovereign mode).
    const aestheticPalette = pickPalette(sanitized.asset.category_path, sanitized.asset.traits);

    return json({
      ok: true,
      ...sanitized,
      aesthetic_image_data_url: null,
      aesthetic_palette: aestheticPalette,
    });
  } catch (e) {
    console.error("vision_genesis error:", e);
    const msg = e instanceof Error ? e.message : String(e);
    return json(
      { error: "UNHANDLED", details: msg, stack: e instanceof Error ? e.stack?.slice(0, 600) : undefined },
      500,
    );
  }
});
