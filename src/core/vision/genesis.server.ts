import { Tracer } from "@/core/system/observability/Tracer";

/**
 * Vision Genesis — Server-only core logic (Wave P-4.1).
 *
 * Ported verbatim from the legacy `supabase/functions/vision_genesis/`
 * Edge Function. Multi-provider sovereign router (Gemini → OpenRouter →
 * DeepSeek). Imported only by `.functions.ts` server-fn handlers; never
 * by client code.
 */
// Wave P-9 C: typed boundaries; remaining `any` confined to recursive JSON-Schema walker
// and the LLM-payload normalizer (Strategy A — Batch D will tighten SDUI/runtime polymorphism).

class ProviderHTTPError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ProviderHTTPError";
    this.status = status;
  }
}

type GeminiPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } }
  | { functionCall?: { name: string; args: unknown } };

type OpenAIContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

type SchemaNode = Record<string, unknown> | unknown[] | string | number | boolean | null;

const ASSET_TYPES = ["physical", "digital", "service", "rental", "milestone_project"] as const;
const PRICING_MODELS = [
  "flat",
  "tiered_wholesale",
  "subscription",
  "deposit_and_rental",
  "milestone_installments",
] as const;

export type VisionProvider = "gemini" | "openrouter" | "deepseek";

const PALETTES: Array<{ name: string; hex: string }> = [
  { name: "mint green", hex: "#D1FAE5" },
  { name: "warm cream", hex: "#FEF3C7" },
  { name: "blush pink", hex: "#FCE7F3" },
  { name: "powder blue", hex: "#DBEAFE" },
  { name: "soft lavender", hex: "#EDE9FE" },
  { name: "sand beige", hex: "#F5F1E8" },
  { name: "sage", hex: "#E2E8DD" },
];

export function pickPalette(category: string | null, traits: string[]): { name: string; hex: string } {
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
8. إن لم يوجد سعر، اقترح سعراً منطقياً للسوق المصري بالجنيه (EGP).
9. حقول سيادية إجبارية يجب استخراجها دائمًا من الصورة (لا تتركها فارغة): category_path (هرمي)، brand، barcode (إن ظهر على العبوة)، halal (true/false بناءً على شعار الحلال أو طبيعة المنتج)، nutrition، net_weight + weight_unit، variant_axes (size/flavor) داخل كل SKU.
10. tier_rules: إن كان المنتج يدعم تسعير الجملة/الكمية، أرجع كائن بقواعد الطبقات مثل {"min_qty": 12, "discount_pct": 10}، وإلا اتركه null.`;

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
        barcode: { type: ["string", "null"] },
        halal: { type: ["boolean", "null"] },
        tier_rules: { type: ["object", "null"], additionalProperties: true },
      },
      required: ["name", "description", "asset_type", "traits", "category_path", "brand"],
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

type ProviderResult = { parsed: unknown; raw?: unknown };

function dataUrlParts(dataUrl: string): { mime: string; b64: string } {
  const m = /^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/.exec(dataUrl);
  if (!m) throw new Error("invalid_data_url");
  return { mime: m[1], b64: m[2] };
}

function toGeminiSchema(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(toGeminiSchema);
  if (!node || typeof node !== "object") return node;
  const src = node as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(src)) {
    if (k === "additionalProperties") continue;
    if (k === "type" && Array.isArray(v)) {
      const nonNull = (v as unknown[]).filter((t) => t !== "null");
      out.type = nonNull[0] ?? "string";
      if ((v as unknown[]).includes("null")) out.nullable = true;
    } else if (k === "enum" && Array.isArray(v)) {
      const cleaned = (v as unknown[]).filter((x) => x !== null);
      if (cleaned.length) out.enum = cleaned;
      if ((v as unknown[]).includes(null)) out.nullable = true;
    } else if (k === "properties" && v && typeof v === "object") {
      const props: Record<string, unknown> = {};
      for (const [pk, pv] of Object.entries(v as Record<string, unknown>)) {
        props[pk] = toGeminiSchema(pv);
      }
      out.properties = props;
    } else if (k === "items") {
      out.items = toGeminiSchema(v);
    } else {
      out[k] = toGeminiSchema(v);
    }
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
  const parts: GeminiPart[] = [
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
    throw new ProviderHTTPError(err.message, res.status);
    throw err;
  }
  const data = JSON.parse(text);
  const fnCall =
    data?.candidates?.[0]?.content?.parts?.find((p: GeminiPart) => "functionCall" in p && p.functionCall)?.functionCall;
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
  const userContent: OpenAIContentPart[] = [
    {
      type: "text",
      text: `حلّل ${secondary ? "الصورتين معاً" : "هذه الصورة"} واستخرج الـ Product DNA الكامل. ${hint ? `سياق إضافي: ${hint}` : ""}`,
    },
    { type: "image_url", image_url: { url: primary } },
    ...(secondary ? [{ type: "image_url" as const, image_url: { url: secondary } }] : []),
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
    throw new ProviderHTTPError(err.message, res.status);
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
  provider: VisionProvider,
  primary: string,
  secondary: string | null,
  hint: string | undefined,
): Promise<ProviderResult> {
  if (provider === "gemini") {
    const key = process.env.Gemini;
    if (!key) throw new Error("missing_key:Gemini");
    return callGemini({ apiKey: key, primary, secondary, hint });
  }
  if (provider === "openrouter") {
    const key = process.env.OpenRouter;
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
    const key = process.env.DeepSeek;
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

export interface VisionGenesisInput {
  image_base64?: string;
  secondary_image_base64?: string | null;
  images_base64?: string[];
  hint?: string;
  provider?: VisionProvider;
}

export type AssetType = (typeof ASSET_TYPES)[number];
export type PricingModel = (typeof PRICING_MODELS)[number];
export type WeightUnit = "g" | "kg" | "ml" | "L" | "piece";
export type Currency = "EGP" | "USD" | "EUR";

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };
export type JsonObject = { [key: string]: JsonValue };


export interface VisionAssetMarketing {
  short: string | null;
  long: string | null;
}
export interface VisionAssetNutrition {
  kcal: number | null;
  protein_g: number | null;
  fat_g: number | null;
  carbs_g: number | null;
  sugar_g: number | null;
}
export interface VisionAssetPhysical {
  net_weight: number | null;
  weight_unit: WeightUnit | null;
}
export interface VisionAssetDTO {
  name: string;
  description: string;
  asset_type: AssetType;
  traits: string[];
  category_path: string | null;
  brand: string | null;
  origin_country: string | null;
  marketing: VisionAssetMarketing | null;
  nutrition: VisionAssetNutrition | null;
  physical: VisionAssetPhysical | null;
  allergens: string[] | null;
}
export interface VisionSkuVariantAxes {
  size: string | null;
  flavor: string | null;
}
export interface VisionSkuDTO {
  sku_code: string;
  attributes: JsonObject;
  barcode: string | null;
  variant_axes: VisionSkuVariantAxes | null;
}
export interface VisionFinancialContractDTO {
  pricing_model: PricingModel;
  base_price: number;
  currency: Currency;
  contract_rules: JsonObject;
}

export interface VisionGenesisOutput {
  ok: boolean;
  error?: string;
  details?: string;
  attempts?: Array<{ provider: VisionProvider; ok: boolean; error?: string }>;
  asset?: VisionAssetDTO;
  skus?: VisionSkuDTO[];
  financial_contract?: VisionFinancialContractDTO;
  prompt_version?: string;
  provider?: VisionProvider | null;
  provider_attempts?: Array<{ provider: VisionProvider; ok: boolean; error?: string }>;
  generated_at?: string;
  aesthetic_image_data_url?: string | null;
  aesthetic_palette?: { name: string; hex: string };
  critical_crash?: string;
  stack?: string;
}

export async function runVisionGenesis(body: VisionGenesisInput): Promise<VisionGenesisOutput> {
  try {
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
      return { ok: false, error: "missing_image", details: "image_base64 is required" };

    const MAX_DATA_URL_BYTES = 600 * 1024;
    const DATA_URL_RE = /^data:image\/(jpeg|jpg|png|webp|gif);base64,[A-Za-z0-9+/=]+$/;
    for (const d of datas) {
      if (!DATA_URL_RE.test(d))
        return { ok: false, error: "invalid_image", details: "image must be a data:image/* base64 URL" };
      if (d.length > MAX_DATA_URL_BYTES)
        return {
          ok: false,
          error: "invalid_image",
          details: `image_too_large:${d.length} (compress client-side, max ${MAX_DATA_URL_BYTES})`,
        };
    }

    const primaryUrl = datas[0];
    const secondaryUrl = datas.length > 1 ? datas[1] : null;

    const allowed: VisionProvider[] = ["gemini", "openrouter", "deepseek"];
    const primary: VisionProvider =
      requestedProvider && allowed.includes(requestedProvider) ? requestedProvider : "gemini";
    const failoverChain: VisionProvider[] =
      primary === "gemini" ? ["gemini", "openrouter"] : [primary];

    let parsed: Record<string, unknown> | null = null;
    let usedProvider: VisionProvider | null = null;
    const attempts: Array<{ provider: VisionProvider; ok: boolean; error?: string }> = [];

    const isObj = (v: unknown): v is Record<string, unknown> =>
      typeof v === "object" && v !== null && !Array.isArray(v);

    for (const p of failoverChain) {
      try {
        const result = await invokeProvider(p, primaryUrl, secondaryUrl, hint);
        parsed = isObj(result.parsed) ? result.parsed : {};
        usedProvider = p;
        attempts.push({ provider: p, ok: true });
        break;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        Tracer.error("vision", "log", { args: [`[vision_genesis] provider=${p} failed:`, msg] });
        attempts.push({ provider: p, ok: false, error: msg });
      }
    }

    if (!parsed || !usedProvider) {
      return { ok: false, error: "AI_API_ERROR", details: "all providers failed", attempts };
    }

    const a: Record<string, unknown> = isObj(parsed.asset) ? parsed.asset : {};
    const fc: Record<string, unknown> = isObj(parsed.financial_contract)
      ? parsed.financial_contract
      : {};
    const skusRaw: unknown[] = Array.isArray(parsed.skus) ? parsed.skus : [];

    const assetTypeRaw = isObj(a) ? a.asset_type : undefined;
    const assetType: AssetType = (ASSET_TYPES as readonly string[]).includes(
      typeof assetTypeRaw === "string" ? assetTypeRaw : "",
    )
      ? (assetTypeRaw as AssetType)
      : "physical";
    const pricingRaw = fc.pricing_model;
    const pricingModel: PricingModel = (PRICING_MODELS as readonly string[]).includes(
      typeof pricingRaw === "string" ? pricingRaw : "",
    )
      ? (pricingRaw as PricingModel)
      : "flat";

    const optStr = (v: unknown, max = 500): string | null =>
      typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null;
    const optNum = (v: unknown): number | null =>
      typeof v === "number" && Number.isFinite(v) ? v : null;
    const optStrArr = (v: unknown, max = 20): string[] | null =>
      Array.isArray(v)
        ? v.filter((x): x is string => typeof x === "string").slice(0, max)
        : null;
    const toJsonObject = (v: unknown): JsonObject =>
      isObj(v) ? (JSON.parse(JSON.stringify(v)) as JsonObject) : {};

    const marketingRaw = isObj(a.marketing) ? a.marketing : null;
    const marketing: VisionAssetMarketing | null = marketingRaw
      ? { short: optStr(marketingRaw.short, 200), long: optStr(marketingRaw.long, 2000) }
      : null;
    const nutritionRaw = isObj(a.nutrition) ? a.nutrition : null;
    const nutrition: VisionAssetNutrition | null = nutritionRaw
      ? {
          kcal: optNum(nutritionRaw.kcal),
          protein_g: optNum(nutritionRaw.protein_g),
          fat_g: optNum(nutritionRaw.fat_g),
          carbs_g: optNum(nutritionRaw.carbs_g),
          sugar_g: optNum(nutritionRaw.sugar_g),
        }
      : null;
    const physicalRaw = isObj(a.physical) ? a.physical : null;
    const WEIGHT_UNITS: WeightUnit[] = ["g", "kg", "ml", "L", "piece"];
    const physical: VisionAssetPhysical | null = physicalRaw
      ? {
          net_weight: optNum(physicalRaw.net_weight),
          weight_unit:
            typeof physicalRaw.weight_unit === "string" &&
            (WEIGHT_UNITS as string[]).includes(physicalRaw.weight_unit)
              ? (physicalRaw.weight_unit as WeightUnit)
              : null,
        }
      : null;

    const sanitizedAsset: VisionAssetDTO = {
      name: String(a.name ?? "أصل بدون اسم").slice(0, 200),
      description: String(a.description ?? "").slice(0, 2000),
      asset_type: assetType,
      traits: Array.isArray(a.traits)
        ? (a.traits as unknown[]).filter((t): t is string => typeof t === "string").slice(0, 20)
        : [],
      category_path: optStr(a.category_path, 200),
      brand: optStr(a.brand, 120),
      origin_country: optStr(a.origin_country, 80),
      marketing,
      nutrition,
      physical,
      allergens: optStrArr(a.allergens, 20),
    };

    const sanitizedSkus: VisionSkuDTO[] = skusRaw.slice(0, 20).map((sRaw, i) => {
      const s: Record<string, unknown> = isObj(sRaw) ? sRaw : {};
      const va = isObj(s.variant_axes) ? s.variant_axes : null;
      return {
        sku_code: String(s.sku_code ?? `SKU-${Date.now()}-${i}`).slice(0, 64),
        attributes: toJsonObject(s.attributes),
        barcode: optStr(s.barcode, 64),
        variant_axes: va
          ? { size: optStr(va.size, 64), flavor: optStr(va.flavor, 64) }
          : null,
      };
    });

    const CURRENCIES: Currency[] = ["EGP", "USD", "EUR"];
    const sanitizedContract: VisionFinancialContractDTO = {
      pricing_model: pricingModel,
      base_price: Math.max(0, Number(fc.base_price) || 0),
      currency:
        typeof fc.currency === "string" && (CURRENCIES as string[]).includes(fc.currency)
          ? (fc.currency as Currency)
          : "EGP",
      contract_rules: toJsonObject(fc.contract_rules),
    };

    const sanitized = {
      asset: sanitizedAsset,
      skus: sanitizedSkus,
      financial_contract: sanitizedContract,
      prompt_version: "v2-multi-provider",
      provider: usedProvider,
      provider_attempts: attempts,
      generated_at: new Date().toISOString(),
    };

    const aestheticPalette = pickPalette(sanitized.asset.category_path, sanitized.asset.traits);

    return {
      ok: true,
      ...sanitized,
      aesthetic_image_data_url: null,
      aesthetic_palette: aestheticPalette,
    };
  } catch (e) {
    Tracer.error("vision", "vision_genesis_critical_crash", { args: ["vision_genesis CRITICAL CRASH:", e] });
    const msg = e instanceof Error ? e.message : String(e);
    const stack = e instanceof Error ? e.stack?.slice(0, 1200) : undefined;
    return { ok: false, critical_crash: msg, stack };
  }
}

// ─── Embedding (deterministic SHA-256 based) ────────────────────────────
const EMBED_DIMS = 768;

export async function generateDeterministicEmbedding(text: string): Promise<number[]> {
  const enc = new TextEncoder();
  const normalized = text.trim().toLowerCase();
  const out = new Float64Array(EMBED_DIMS);
  const rounds = Math.ceil(EMBED_DIMS / 32);
  for (let r = 0; r < rounds; r++) {
    const buf = await crypto.subtle.digest("SHA-256", enc.encode(`${r}:${normalized}`));
    const view = new DataView(buf);
    for (let i = 0; i < 32 && r * 32 + i < EMBED_DIMS; i++) {
      out[r * 32 + i] = (view.getUint8(i) - 127.5) / 127.5;
    }
  }
  let norm = 0;
  for (let i = 0; i < EMBED_DIMS; i++) norm += out[i] * out[i];
  norm = Math.sqrt(norm) || 1;
  return Array.from(out, (v) => v / norm);
}

// ─── Product image generation (Lovable AI Gateway) ──────────────────────
function buildProductImagePrompt(name: string, source: string | null): string {
  const ctx = (source ?? "").toLowerCase();
  const ctxHint =
    ctx === "pharmacy"
      ? "pharmacy product packaging on white background"
      : ctx === "produce"
        ? "fresh produce, vibrant, on light wooden surface"
        : ctx === "meat"
          ? "raw butcher cut, professional food photography"
          : ctx === "dairy"
            ? "dairy product packaging, soft daylight"
            : ctx === "sweets"
              ? "Egyptian/Middle-Eastern dessert, plated, warm light"
              : ctx === "library"
                ? "stationery item, flat lay on desk"
                : ctx === "restaurants" || ctx === "recipes"
                  ? "served meal, top-down food photography"
                  : "Egyptian supermarket product on clean studio background";
  return `Professional commercial product photo of "${name}". ${ctxHint}. Sharp focus, soft shadows, e-commerce catalog style, square 1:1, high detail, no text overlays, no watermarks.`;
}

export async function generateProductImageBytes(name: string, source: string | null): Promise<Uint8Array> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("missing_key:LOVABLE_API_KEY");
  const prompt = buildProductImagePrompt(name, source);
  const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash-image",
      messages: [{ role: "user", content: prompt }],
      modalities: ["image", "text"],
    }),
  });
  if (!r.ok) throw new Error(`AI ${r.status}: ${await r.text()}`);
  const j = await r.json();
  const dataUrl: string | undefined = j.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  if (!dataUrl) throw new Error("No image returned");
  const b64 = dataUrl.split(",")[1] ?? dataUrl;
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}
