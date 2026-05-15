// User Account Gateway (Wave P-D, Phase D-1)
// ------------------------------------------------------------------
// Sanctioned `createServerFn` handlers replacing direct
// `supabase.from(...)` calls in the 5 user-account UI files.
// All handlers compose `requireSupabaseAuth` so RLS applies as
// the signed-in user; `userId` is taken from the validated bearer
// token, never from client input.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { Tracer } from "@/core/system/observability/Tracer";

// ─── Profile ──────────────────────────────────────────────────────
const PROFILE_COLUMNS =
  "id, full_name, phone, birth_date, gender, avatar_key, occupation, household_size, lifestyle_tags, likes, dislikes, budget_range";

export type ProfileRow = {
  id: string;
  full_name: string | null;
  phone: string | null;
  birth_date: string | null;
  gender: string | null;
  avatar_key: string | null;
  occupation: string | null;
  household_size: number | null;
  lifestyle_tags: string[] | null;
  likes: string[] | null;
  dislikes: string[] | null;
  budget_range: string | null;
};

export const getMyProfileFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ProfileRow | null> => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("profiles")
      .select(PROFILE_COLUMNS)
      .eq("id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (data as ProfileRow | null) ?? null;
  });

export type ProfileUpsert = {
  full_name: string;
  phone: string | null;
  birth_date: string | null;
  gender: string;
  avatar_key: string | null;
  occupation: string | null;
  household_size: number | null;
  lifestyle_tags: string[];
  likes: string[];
  dislikes: string[];
  budget_range: string | null;
};

export const updateMyProfileFn = createServerFn({ method: "POST" })
  .inputValidator((d: ProfileUpsert) => d)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("profiles")
      .upsert({ id: userId, ...data }, { onConflict: "id" });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

// ─── Addresses ────────────────────────────────────────────────────
export type AddressRow = {
  id: string;
  label: string;
  city: string;
  district: string | null;
  street: string | null;
  building: string | null;
  floor: string | null;
  apartment_no: string | null;
  recipient_name: string | null;
  recipient_phone: string | null;
  delivery_instructions: string | null;
  notes: string | null;
  is_default: boolean;
};

export const listMyAddressesFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AddressRow[]> => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("addresses")
      .select(
        "id, label, city, district, street, building, floor, apartment_no, recipient_name, recipient_phone, delivery_instructions, notes, is_default",
      )
      .eq("user_id", userId)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data as AddressRow[] | null) ?? [];
  });

export const setDefaultAddressFn = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => d)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const off = await supabase
      .from("addresses")
      .update({ is_default: false })
      .eq("user_id", userId);
    if (off.error) throw new Error(off.error.message);
    const on = await supabase
      .from("addresses")
      .update({ is_default: true })
      .eq("id", data.id)
      .eq("user_id", userId);
    if (on.error) throw new Error(on.error.message);
    return { ok: true as const };
  });

export const deleteAddressFn = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => d)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("addresses")
      .delete()
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

// ─── Notifications ────────────────────────────────────────────────
export type NotificationRow = {
  id: string;
  title: string;
  body: string | null;
  icon: string | null;
  read: boolean;
  created_at: string;
};

export const listMyNotificationsFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<NotificationRow[]> => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("notifications")
      .select("id, title, body, icon, read, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data as NotificationRow[] | null) ?? [];
  });

export const markAllNotificationsReadFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", userId)
      .eq("read", false);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

// ─── Account Hub (wallet / orders / spend / KYC) ──────────────────
export type AccountHub = {
  balance: number;
  points: number;
  ordersCount: number;
  totalSpent: number;
  kycStatus: "pending" | "verified" | "rejected" | null;
};

export const getMyAccountHubFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AccountHub> => {
    const { supabase, userId } = context;
    const [{ data: w }, { count }, spentRes, { data: kyc }] = await Promise.all([
      supabase
        .from("wallet_balances")
        .select("balance, points")
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("salsabil_master_orders")
        .select("id", { count: "exact", head: true })
        .eq("customer_id", userId),
      // user_total_spent RPC may not exist in all environments — tolerate
      (async () => {
        try {
          return await (supabase as unknown as {
            rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown }>;
          }).rpc("user_total_spent", { _user_id: userId });
        } catch {
          return { data: 0 };
        }
      })(),
      supabase
        .from("kyc_verifications")
        .select("status")
        .eq("user_id", userId)
        .maybeSingle(),
    ]);
    const wallet = (w ?? null) as { balance?: number | string; points?: number | string } | null;
    const kycRow = (kyc ?? null) as { status?: AccountHub["kycStatus"] } | null;
    return {
      balance: Number(wallet?.balance ?? 0),
      points: Number(wallet?.points ?? 0),
      ordersCount: count ?? 0,
      totalSpent: Number(spentRes?.data ?? 0),
      kycStatus: kycRow?.status ?? null,
    };
  });

// ─── Hakim Insights ───────────────────────────────────────────────
export type HakimSeverity = "info" | "advisory" | "warning" | "critical";
export type HakimInsight = {
  id: string;
  user_id: string;
  workspace_id: string;
  severity: HakimSeverity;
  kind: string;
  title: string;
  summary: string | null;
  suggestions: object | null;
  created_at: string;
  read_at: string | null;
};

export const getHakimInsightsFn = createServerFn({ method: "GET" })
  .inputValidator((d: { workspaceId?: string | null }) => d)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }): Promise<HakimInsight[]> => {
    const { supabase, userId } = context;
    let q = (supabase as unknown as {
      from: (t: string) => {
        select: (s: string) => {
          eq: (c: string, v: string) => unknown;
          is: (c: string, v: null) => unknown;
        };
      };
    })
      .from("hakim_user_insights")
      .select("*") as unknown as {
      eq: (c: string, v: string) => typeof q;
      is: (c: string, v: null) => typeof q;
      order: (c: string, o: { ascending: boolean }) => typeof q;
      limit: (n: number) => Promise<{ data: HakimInsight[] | null; error: { message: string } | null }>;
    };
    q = q.eq("user_id", userId);
    if (data.workspaceId) q = q.eq("workspace_id", data.workspaceId);
    q = q.is("read_at", null).order("created_at", { ascending: false });
    const { data: rows, error } = await q.limit(20);
    if (error) throw new Error(error.message);
    return (rows ?? []) as HakimInsight[];
  });

export const markHakimInsightReadFn = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => d)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await (supabase as unknown as {
      from: (t: string) => {
        update: (v: Record<string, unknown>) => {
          eq: (c: string, v: string) => {
            eq: (c: string, v: string) => Promise<{ error: { message: string } | null }>;
          };
        };
      };
    })
      .from("hakim_user_insights")
      .update({ read_at: new Date().toISOString() })
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export type HakimSnapshot = {
  balance?: number;
  income?: number;
  expense?: number;
  savings_velocity?: number;
  top_categories?: Array<{ category: string; amount: number; count: number }>;
};

export const getHakimSnapshotFn = createServerFn({ method: "GET" })
  .inputValidator((d: { days?: number }) => d)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }): Promise<HakimSnapshot | null> => {
    const { supabase, userId } = context;
    const { data: rows } = await supabase.rpc("hakim_user_financial_snapshot", {
      p_user_id: userId,
      p_days: data.days ?? 30,
    });
    return ((rows as unknown) as HakimSnapshot | null) ?? null;
  });

// ─── Hakim Chat (non-streaming Q&A — Wave P-4.2 sovereign) ─────────
export type HakimChatReply = { reply: string };

export const chatHakimFn = createServerFn({ method: "POST" })
  .inputValidator((d: { message: string; scope?: string; snapshot?: HakimSnapshot | null }) => d)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data }): Promise<HakimChatReply> => {
    const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
    if (!LOVABLE_API_KEY) {
      return { reply: "تعذّر الوصول إلى حكيم الآن. حاول لاحقاً." };
    }
    const scope = data.scope ?? "wallet";
    const systemPrompt = `أنت "حكيم" — المستشار المالي الذكي. أجب بإيجاز بالعربية بناءً على البيانات المتاحة (نطاق: ${scope}). لا تخترع أرقاماً.`;
    const userPrompt = `سؤال المستخدم: ${data.message}\n\nاللقطة المالية:\n${JSON.stringify(data.snapshot ?? null, null, 2)}`;
    try {
      const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        }),
      });
      if (!aiRes.ok) {
        Tracer.error("identity", "hakim_chat_ai_error", { args: ["hakim-chat ai error", aiRes.status] });
        return { reply: "تعذّر الوصول إلى حكيم الآن. حاول لاحقاً." };
      }
      const json = (await aiRes.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const reply = json?.choices?.[0]?.message?.content ?? "…";
      return { reply };
    } catch (e) {
      Tracer.error("identity", "hakim_chat_error", { args: ["hakim-chat error", e] });
      return { reply: "تعذّر الوصول إلى حكيم الآن. حاول لاحقاً." };
    }
  });
