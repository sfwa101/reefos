// Finance Gateway — Wave R-1 · Batch 1.
// Sanctioned `createServerFn` handlers for Payments Schedule, Charity rules,
// Riba audit, and Driver settlements. All gated by `requireAdmin`.
import { createServerFn } from "@tanstack/react-start";
import { requireAdmin } from "@/integrations/supabase/admin-middleware";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SbAny = any;

// ---- Payments Schedule ----------------------------------------------------
export type PaymentsScheduleRow = {
  id: string;
  invoice_number: string | null;
  invoice_date: string;
  due_date: string | null;
  total: number;
  paid_amount: number;
  remaining: number;
  status: string;
  supplier_id: string;
  supplier_name: string;
  closing_day: number | null;
  collection_days: number[] | null;
};

export const getPaymentsScheduleFn = createServerFn({ method: "GET" })
  .inputValidator((d: { days_ahead: number }) => {
    const n = Number(d?.days_ahead);
    if (!Number.isFinite(n) || n <= 0 || n > 365) throw new Error("invalid_days_ahead");
    return { days_ahead: Math.floor(n) };
  })
  .middleware([requireAdmin])
  .handler(async ({ data, context }): Promise<PaymentsScheduleRow[]> => {
    const sb = context.supabase as SbAny;
    const { data: rows, error } = await sb.rpc("payments_schedule", { _days_ahead: data.days_ahead });
    if (error) throw new Error(error.message);
    return (rows ?? []) as PaymentsScheduleRow[];
  });

// ---- Charity --------------------------------------------------------------
export type CharityRule = {
  id: string;
  name: string;
  base: "gross_sales" | "net_profit" | "custom_amount";
  percentage: number | null;
  fixed_amount: number | null;
  frequency: "daily" | "weekly" | "monthly";
  is_active: boolean;
};

export type CharityDue = {
  rule_id: string;
  rule_name: string;
  base: string;
  frequency: string;
  percentage: number | null;
  base_amount: number;
  due_amount: number;
};

export type CharityDuesSnapshot = {
  rules: CharityDue[];
  gross_sales: number;
  net_profit: number;
};

export type CharityOverview = {
  rules: CharityRule[];
  dues: CharityDuesSnapshot | null;
};

function isoDateOffset(daysBack: number): string {
  return new Date(Date.now() - daysBack * 86_400_000).toISOString().slice(0, 10);
}

export const getCharityOverviewFn = createServerFn({ method: "GET" })
  .inputValidator((d: { period_days: number }) => {
    const n = Number(d?.period_days);
    if (!Number.isFinite(n) || n <= 0 || n > 365) throw new Error("invalid_period");
    return { period_days: Math.floor(n) };
  })
  .middleware([requireAdmin])
  .handler(async ({ data, context }): Promise<CharityOverview> => {
    const sb = context.supabase as SbAny;
    const start = isoDateOffset(data.period_days);
    const end = new Date().toISOString().slice(0, 10);
    const [rulesRes, duesRes] = await Promise.all([
      sb.from("charity_rules").select("*").order("created_at", { ascending: false }).limit(1000),
      sb.rpc("compute_charity_dues", { _start: start, _end: end }),
    ]);
    if (rulesRes.error) throw new Error(rulesRes.error.message);
    if (duesRes.error) throw new Error(duesRes.error.message);
    const d = duesRes.data as { rules?: CharityDue[]; gross_sales?: number; net_profit?: number } | null;
    return {
      rules: (rulesRes.data ?? []) as CharityRule[],
      dues: d
        ? {
            rules: (d.rules ?? []) as CharityDue[],
            gross_sales: Number(d.gross_sales ?? 0),
            net_profit: Number(d.net_profit ?? 0),
          }
        : null,
    };
  });

export type CharityRuleInput = {
  name: string;
  base: "gross_sales" | "net_profit" | "custom_amount";
  percentage: number | null;
  fixed_amount: number | null;
  frequency: "daily" | "weekly" | "monthly";
};

export const createCharityRuleFn = createServerFn({ method: "POST" })
  .inputValidator((d: CharityRuleInput) => {
    if (!d?.name?.trim()) throw new Error("name_required");
    if (!["gross_sales", "net_profit", "custom_amount"].includes(d.base)) throw new Error("invalid_base");
    if (!["daily", "weekly", "monthly"].includes(d.frequency)) throw new Error("invalid_frequency");
    return d;
  })
  .middleware([requireAdmin])
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    const sb = context.supabase as SbAny;
    const payload = {
      name: data.name.trim(),
      base: data.base,
      frequency: data.frequency,
      percentage: data.base === "custom_amount" ? null : Number(data.percentage ?? 0),
      fixed_amount: data.base === "custom_amount" ? Number(data.fixed_amount ?? 0) : null,
    };
    const { data: row, error } = await sb.from("charity_rules").insert(payload).select("id").single();
    if (error) throw new Error(error.message);
    return { id: row.id as string };
  });

export const setCharityRuleActiveFn = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; is_active: boolean }) => {
    if (!d?.id) throw new Error("id_required");
    return { id: d.id, is_active: !!d.is_active };
  })
  .middleware([requireAdmin])
  .handler(async ({ data, context }) => {
    const sb = context.supabase as SbAny;
    const { error } = await sb.from("charity_rules").update({ is_active: data.is_active }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---- Riba audit -----------------------------------------------------------
export type RibaFlag = {
  id: string;
  source_table: string;
  source_id: string;
  category: string;
  severity: string;
  amount: number | null;
  description: string;
  recommendation: string | null;
  status: string;
  created_at: string;
};

export const listRibaFlagsFn = createServerFn({ method: "GET" })
  .inputValidator((d: { status?: string }) => ({ status: d?.status ?? "flagged" }))
  .middleware([requireAdmin])
  .handler(async ({ data, context }): Promise<RibaFlag[]> => {
    const sb = context.supabase as SbAny;
    let q = sb.from("riba_audit_log").select("*").order("created_at", { ascending: false });
    if (data.status && data.status !== "all") q = q.eq("status", data.status);
    const { data: rows, error } = await q.limit(50);
    if (error) throw new Error(error.message);
    return (rows ?? []) as RibaFlag[];
  });

export const scanRibaSuspicionsFn = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .handler(async ({ context }): Promise<{ flagged_now: number }> => {
    const sb = context.supabase as SbAny;
    const { data, error } = await sb.rpc("scan_riba_suspicions");
    if (error) throw new Error(error.message);
    return { flagged_now: Number((data as { flagged_now?: number } | null)?.flagged_now ?? 0) };
  });

export const updateRibaFlagStatusFn = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; status: string }) => {
    if (!d?.id) throw new Error("id_required");
    if (!["flagged", "reviewed", "dismissed"].includes(d.status)) throw new Error("invalid_status");
    return d;
  })
  .middleware([requireAdmin])
  .handler(async ({ data, context }) => {
    const sb = context.supabase as SbAny;
    const { error } = await sb
      .from("riba_audit_log")
      .update({ status: data.status, reviewed_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---- Driver settlements ---------------------------------------------------
export type DriverWalletRow = {
  driver_id: string;
  full_name: string;
  driver_type: string;
  cash_in_hand: number;
  earned_balance: number;
  lifetime_earned: number;
  lifetime_settled: number;
};

export const listDriverWalletsFn = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async ({ context }): Promise<DriverWalletRow[]> => {
    const sb = context.supabase as SbAny;
    const { data, error } = await sb
      .from("driver_wallets")
      .select("*, drivers!inner(full_name, driver_type)")
      .order("cash_in_hand", { ascending: false });
    if (error) throw new Error(error.message);
    type DwRow = {
      driver_id: string;
      cash_in_hand: number;
      earned_balance: number;
      lifetime_earned: number;
      lifetime_settled: number;
      drivers: { full_name: string; driver_type: string };
    };
    return ((data ?? []) as DwRow[]).map((r) => ({
      driver_id: r.driver_id,
      cash_in_hand: Number(r.cash_in_hand ?? 0),
      earned_balance: Number(r.earned_balance ?? 0),
      lifetime_earned: Number(r.lifetime_earned ?? 0),
      lifetime_settled: Number(r.lifetime_settled ?? 0),
      full_name: r.drivers.full_name,
      driver_type: r.drivers.driver_type,
    }));
  });

export const settleDriverCashFn = createServerFn({ method: "POST" })
  .inputValidator((d: { driver_id: string; amount: number; kind: string; bank_reference: string | null; notes: string | null }) => {
    if (!d?.driver_id) throw new Error("driver_required");
    const amt = Number(d.amount);
    if (!Number.isFinite(amt) || amt <= 0) throw new Error("invalid_amount");
    if (!["cash_handover", "commission_payout"].includes(d.kind)) throw new Error("invalid_kind");
    return { ...d, amount: amt };
  })
  .middleware([requireAdmin])
  .handler(async ({ data, context }) => {
    const sb = context.supabase as SbAny;
    const { error } = await sb.rpc("driver_settle_cash", {
      _driver_id: data.driver_id,
      _amount: data.amount,
      _kind: data.kind,
      _bank_reference: data.bank_reference || null,
      _notes: data.notes || null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
