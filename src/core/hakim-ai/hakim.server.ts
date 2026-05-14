/**
 * Hakim AI — server-only helpers (Wave P-4.2).
 *
 * Replicates the legacy edge function logic for:
 *   - hakim-pulse        (currently a no-op stub returning empty insights)
 *   - hakim-advisor      (financial advisor structured insight)
 *   - hakim_architect    (sovereign blueprint generator)
 *   - hakim-chat (NON-streaming variant; SSE lives in routes/api/hakim-chat.ts)
 *
 * Logic ported as-is — prompts, models, tool-calls, error envelopes preserved.
 * Reads Lovable AI key from `process.env.LOVABLE_API_KEY` (server-only).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

type DynamicRpc = <T = unknown>(
  name: string,
  args?: Record<string, unknown>,
) => Promise<{ data: T | null; error: { message: string } | null }>;

// ─── Hakim Tool-Call Discriminated Union (Constitution Ch. 8) ──────────
export interface HakimSubmitInsightArgs {
  severity: "info" | "warning" | "critical" | "success";
  title: string;
  summary: string;
  recommendations: Array<{ action: string; priority: "low" | "medium" | "high" }>;
}

export interface HakimSubmitBlueprintAsset {
  name: string;
  asset_type: "physical" | "service" | "digital" | "rental" | "milestone_project";
  pricing_model:
    | "flat"
    | "tiered_wholesale"
    | "subscription"
    | "deposit_and_rental"
    | "milestone_installments";
  base_price: number;
  traits: Record<string, unknown>;
}

export interface HakimSubmitBlueprintArgs {
  module_name: string;
  description: string;
  suggested_assets: HakimSubmitBlueprintAsset[];
  sdui_layout: { hero?: Record<string, unknown>; sections?: Array<Record<string, unknown>> };
}

export type HakimToolCall =
  | { name: "submit_insight"; arguments: HakimSubmitInsightArgs }
  | { name: "submit_blueprint"; arguments: HakimSubmitBlueprintArgs };

interface OpenAIToolCallResponse {
  id?: string;
  type?: "function";
  function?: { name?: string; arguments?: string };
}

interface OpenAIChatResponse {
  choices?: Array<{
    message?: {
      content?: string | null;
      tool_calls?: OpenAIToolCallResponse[];
    };
  }>;
}

const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

// ─── Hakim Pulse (preserved no-op stub) ────────────────────────────────
export interface HakimPulseInput {
  page?: string;
  tiles?: unknown[];
}

export interface HakimPulseOutput {
  pulse?: string;
  insights?: Record<string, { text: string; tone: "positive" | "neutral" | "warning" | "critical" }>;
  disabled: boolean;
  soft_error?: string;
}

export async function runHakimPulse(input: HakimPulseInput): Promise<HakimPulseOutput> {
  try {
    const tiles = Array.isArray(input?.tiles) ? input.tiles : [];
    if (tiles.length > 0) return { insights: {}, disabled: true };
    return { pulse: "", disabled: true };
  } catch (e) {
    return {
      insights: {},
      pulse: "",
      disabled: true,
      soft_error: e instanceof Error ? e.message : "unknown",
    };
  }
}

// ─── Hakim Advisor ─────────────────────────────────────────────────────
export interface HakimAdvisorInput {
  kind?: string;
  days?: number;
  question?: string;
}

export type HakimAdvisorErrorCode = "rate_limited" | "credits_exhausted" | "ai_error";

export interface HakimAdvisorOutput {
  ok: true;
  insight: {
    kind: string;
    severity: string;
    title: string;
    summary: string;
    recommendations: Array<{ action: string; priority: string }>;
    raw_snapshot: unknown;
    generated_for_date: string;
  };
}

export async function runHakimAdvisor(
  input: HakimAdvisorInput,
  userClient: SupabaseClient,
): Promise<HakimAdvisorOutput | { error: HakimAdvisorErrorCode | string }> {
  const kind = input.kind ?? "on_demand";
  const days = input.days ?? 7;
  const question = input.question;

  const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
  if (!LOVABLE_API_KEY) return { error: "ai_error" };

  const { data: snapshot, error: snapErr } = await userClient.rpc("financial_snapshot", {
    _days: days,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as AnyJson);
  if (snapErr) return { error: snapErr.message };

  const systemPrompt = `أنت "حكيم" — المستشار المالي الذكي لشركة "ريف المدينة". تحلل البيانات المالية وتقدم رؤى استباقية وتحذيرات مبكرة وتوصيات عملية. كن مختصراً، عربياً، وعملياً. ركز على: السيولة، الديون المستحقة، هوامش الربح المتآكلة، المنتجات الراكدة، فرص التحسين.`;
  const userPrompt = question
    ? `سؤال المدير: ${question}\n\nالبيانات المالية:\n${JSON.stringify(snapshot, null, 2)}`
    : `حلل هذا الملخص المالي للفترة (${days} أيام) وأعطني رؤى مالية استباقية وتحذيرات وتوصيات:\n\n${JSON.stringify(snapshot, null, 2)}`;

  const aiRes = await fetch(AI_GATEWAY, {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-pro",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "submit_insight",
            description: "Return a structured financial insight",
            parameters: {
              type: "object",
              properties: {
                severity: { type: "string", enum: ["info", "warning", "critical", "success"] },
                title: { type: "string" },
                summary: { type: "string", description: "تحليل مختصر بالعربية (3-6 جمل)" },
                recommendations: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      action: { type: "string" },
                      priority: { type: "string", enum: ["low", "medium", "high"] },
                    },
                    required: ["action", "priority"],
                  },
                },
              },
              required: ["severity", "title", "summary", "recommendations"],
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "submit_insight" } },
    }),
  });

  if (aiRes.status === 429) return { error: "rate_limited" };
  if (aiRes.status === 402) return { error: "credits_exhausted" };
  if (!aiRes.ok) return { error: "ai_error" };

  const aiData = (await aiRes.json()) as AnyJson;
  const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
  let parsed: AnyJson = {};
  if (toolCall?.function?.arguments) {
    try { parsed = JSON.parse(toolCall.function.arguments); } catch { /* noop */ }
  }

  const insight = {
    kind,
    severity: parsed.severity || "info",
    title: parsed.title || "تقرير حكيم",
    summary: parsed.summary || aiData.choices?.[0]?.message?.content || "لا توجد رؤى متاحة",
    recommendations: parsed.recommendations || [],
    raw_snapshot: snapshot,
    generated_for_date: new Date().toISOString().split("T")[0],
  };

  const { data: saved } = await supabaseAdmin
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from("hakim_insights" as any)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .insert(insight as any)
    .select()
    .single();

  return { ok: true, insight: (saved as unknown as typeof insight) || insight };
}

// ─── Hakim Architect ───────────────────────────────────────────────────
const ARCHITECT_SYSTEM_PROMPT = `أنت "حكيم"، كبير المهندسين المعماريين لمنصة سلسبيل OS.
سيأمرك الإمبراطور ببناء قطاع أعمال جديد. مهمتك إعادة مخطط JSON صارم
يصف الوحدة (module_name, description) ومصفوفة من الأصول المقترحة
(suggested_assets) وهيكل SDUI تقريبي (sdui_layout). كن دقيقاً، عملياً،
واستخدم العربية لجميع الأسماء والأوصاف.`;

const ARCHITECT_TOOL_SCHEMA = {
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
              asset_type: { type: "string", enum: ["physical", "service", "digital", "rental", "milestone_project"] },
              pricing_model: { type: "string", enum: ["flat", "tiered_wholesale", "subscription", "deposit_and_rental", "milestone_installments"] },
              base_price: { type: "number" },
              traits: { type: "object", description: "خصائص ديناميكية (duration, brand, capacity, ...)" },
            },
            required: ["name", "asset_type", "pricing_model", "base_price", "traits"],
            additionalProperties: false,
          },
        },
        sdui_layout: {
          type: "object",
          description: "هيكل تقريبي للعرض على تطبيق الموبايل",
          properties: { hero: { type: "object" }, sections: { type: "array", items: { type: "object" } } },
        },
      },
      required: ["module_name", "description", "suggested_assets", "sdui_layout"],
      additionalProperties: false,
    },
  },
};

export interface HakimArchitectOutput {
  ok: true;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  blueprint: any;
  generated_at: string;
}

export async function runHakimArchitect(
  prompt: string,
): Promise<HakimArchitectOutput | { error: string; detail?: string }> {
  if (!prompt || prompt.trim().length < 4) return { error: "missing_or_short_prompt" };

  const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
  if (!LOVABLE_API_KEY) return { error: "missing_lovable_api_key" };

  const aiRes = await fetch(AI_GATEWAY, {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-pro",
      messages: [
        { role: "system", content: ARCHITECT_SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      tools: [ARCHITECT_TOOL_SCHEMA],
      tool_choice: { type: "function", function: { name: "submit_blueprint" } },
    }),
  });

  if (aiRes.status === 429) return { error: "rate_limited" };
  if (aiRes.status === 402) return { error: "credits_exhausted" };
  if (!aiRes.ok) {
    const detail = await aiRes.text();
    return { error: "ai_error", detail };
  }

  const json = (await aiRes.json()) as AnyJson;
  const argsRaw = json?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!argsRaw) return { error: "ai_no_tool_call" };

  let blueprint: unknown;
  try {
    blueprint = typeof argsRaw === "string" ? JSON.parse(argsRaw) : argsRaw;
  } catch (e) {
    return { error: "ai_parse_error", detail: String(e) };
  }
  return { ok: true, blueprint, generated_at: new Date().toISOString() };
}

// ─── Hakim Chat (streaming) — used by routes/api/hakim-chat.ts ─────────
export interface HakimChatStreamRequest {
  session_id?: string | null;
  message: string;
  period_from?: string | null;
  period_to?: string | null;
}

export type HakimChatStreamResult =
  | { ok: true; sid: string; aiBody: ReadableStream<Uint8Array>; admin: SupabaseClient }
  | { ok: false; status: number; error: string; sid?: string };

/**
 * Prepares a streaming Hakim Chat response. Returns either the raw upstream
 * SSE stream (which the route handler will pipe + persist) or an error code
 * envelope. Uses the *user-scoped* Supabase client for RLS-protected calls.
 */
export async function prepareHakimChatStream(
  body: HakimChatStreamRequest,
  userClient: SupabaseClient,
): Promise<HakimChatStreamResult> {
  if (!body?.message || typeof body.message !== "string") {
    return { ok: false, status: 400, error: "missing_message" };
  }

  const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
  if (!LOVABLE_API_KEY) return { ok: false, status: 500, error: "missing_key" };

  const { data: report, error: repErr } = await userClient.rpc("hakim_deep_report", {
    _from: body.period_from ?? null,
    _to: body.period_to ?? null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as AnyJson);
  if (repErr) return { ok: false, status: 403, error: repErr.message };

  const { data: userRes } = await userClient.auth.getUser();
  const userId = userRes?.user?.id;
  if (!userId) return { ok: false, status: 401, error: "unauthorized" };

  let sid = body.session_id ?? undefined;
  if (!sid) {
    const { data: ses } = await supabaseAdmin
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from("hakim_chat_sessions" as any)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .insert({ user_id: userId, title: body.message.slice(0, 60) } as any)
      .select()
      .single();
    sid = (ses as { id?: string } | null)?.id ?? undefined;
  }
  if (!sid) return { ok: false, status: 500, error: "session_create_failed" };

  await supabaseAdmin
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from("hakim_chat_messages" as any)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .insert({ session_id: sid, role: "user", content: body.message } as any);

  const { data: hist } = await supabaseAdmin
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from("hakim_chat_messages" as any)
    .select("role, content")
    .eq("session_id", sid)
    .order("created_at", { ascending: true })
    .limit(30);

  const systemPrompt = `أنت "حكيم" — المستشار المالي والشرعي الذكي لشركة "ريف المدينة" المتخصصة في المنتجات الطبيعية.

دورك:
1. تحليل الأداء المالي بعمق (مبيعات، أرباح، خسائر، مصروفات، التزامات).
2. تشخيص نقاط القوة والضعف في كل قسم/فئة.
3. اقتراح خطط نمو واضحة بهدف الوصول إلى مبيعات مليارية.
4. مراجعة شرعية: حساب الزكاة (2.5% عروض التجارة)، ورصد أي شبهة ربا (فوائد بنكية، غرامات تأخير، زيادة سعرية مقابل التأجيل).
5. الإجابة بالعربية، بلهجة احترافية موجزة، مع أرقام دقيقة وتوصيات قابلة للتنفيذ فوراً.

عند تقديم الرؤى:
- استخدم Markdown منظم (## عناوين، - نقاط، **خط عريض** للأرقام).
- ابدأ بـ "ملخص تنفيذي" ثم اقسم: نقاط القوة، نقاط الضعف، الالتزامات، المراجعة الشرعية، خطة النمو.
- لا تخترع أرقاماً — استخدم فقط البيانات المُرسلة.

البيانات الفعلية للفترة المختارة:
${JSON.stringify(report, null, 2)}`;

  const messages = [
    { role: "system", content: systemPrompt },
    ...((hist ?? []) as unknown as Array<{ role: string; content: string }>).map((m) => ({
      role: m.role,
      content: m.content,
    })),
  ];

  const aiRes = await fetch(AI_GATEWAY, {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "google/gemini-2.5-pro", messages, stream: true }),
  });

  if (aiRes.status === 429) return { ok: false, status: 429, error: "rate_limited", sid };
  if (aiRes.status === 402) return { ok: false, status: 402, error: "credits_exhausted", sid };
  if (!aiRes.ok || !aiRes.body) return { ok: false, status: 500, error: "ai_error", sid };

  return { ok: true, sid, aiBody: aiRes.body, admin: supabaseAdmin };
}
