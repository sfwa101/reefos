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

// ============================================================================
// Wave R-1 · Batch 3 — Expenses, Affiliate Settings, Purchase Invoices,
// Wallet Topups (Maker-Checker), Profile lookup, Product Partners.
// ============================================================================

// ---- Daily Expenses -------------------------------------------------------
export type ExpenseRow = {
  id: string; category: string; subcategory: string | null; amount: number;
  expense_date: string; paid_to: string | null; payment_method: string | null;
  reference: string | null; notes: string | null;
};

export const listExpensesFn = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async ({ context }): Promise<ExpenseRow[]> => {
    const sb = context.supabase as SbAny;
    const { data, error } = await sb
      .from("daily_expenses")
      .select("*")
      .order("expense_date", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return (data ?? []) as ExpenseRow[];
  });

const EXPENSE_CATEGORIES = [
  "operations","salaries","employee_advance","damages","personal_drawings",
  "utilities","rent","marketing","transport","other",
];
const EXPENSE_METHODS = ["cash","bank_transfer","wallet"];

export const createExpenseFn = createServerFn({ method: "POST" })
  .inputValidator((d: {
    category: string; subcategory: string | null; amount: number;
    expense_date: string; paid_to: string | null; payment_method: string;
    reference: string | null; notes: string | null;
  }) => {
    if (!EXPENSE_CATEGORIES.includes(d.category)) throw new Error("invalid_category");
    if (!EXPENSE_METHODS.includes(d.payment_method)) throw new Error("invalid_method");
    const amt = Number(d.amount);
    if (!Number.isFinite(amt) || amt <= 0) throw new Error("invalid_amount");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d.expense_date)) throw new Error("invalid_date");
    return { ...d, amount: amt };
  })
  .middleware([requireAdmin])
  .handler(async ({ data, context }) => {
    const sb = context.supabase as SbAny;
    const { error } = await sb.from("daily_expenses").insert({
      category: data.category,
      subcategory: data.subcategory?.trim() || null,
      amount: data.amount,
      expense_date: data.expense_date,
      paid_to: data.paid_to?.trim() || null,
      payment_method: data.payment_method,
      reference: data.reference?.trim() || null,
      notes: data.notes?.trim() || null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---- Affiliate Settings ---------------------------------------------------
export type AffiliateSettingRow = {
  id: string; category: string; default_commission_pct: number; notes: string | null;
};

export const listAffiliateSettingsFn = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async ({ context }): Promise<AffiliateSettingRow[]> => {
    const sb = context.supabase as SbAny;
    const { data, error } = await sb
      .from("affiliate_settings")
      .select("id,category,default_commission_pct,notes")
      .order("category");
    if (error) throw new Error(error.message);
    return (data ?? []) as AffiliateSettingRow[];
  });

function validateAffiliatePct(pct: number): number {
  const n = Number(pct);
  if (!Number.isFinite(n) || n < 0 || n > 50) throw new Error("invalid_pct");
  return n;
}

export const createAffiliateSettingFn = createServerFn({ method: "POST" })
  .inputValidator((d: { category: string; default_commission_pct: number }) => {
    const cat = (d.category ?? "").trim();
    if (!cat) throw new Error("category_required");
    return { category: cat, default_commission_pct: validateAffiliatePct(d.default_commission_pct) };
  })
  .middleware([requireAdmin])
  .handler(async ({ data, context }) => {
    const sb = context.supabase as SbAny;
    const { error } = await sb.from("affiliate_settings").insert(data);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateAffiliateSettingFn = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; default_commission_pct: number; notes: string | null }) => {
    if (!d?.id) throw new Error("id_required");
    return {
      id: d.id,
      default_commission_pct: validateAffiliatePct(d.default_commission_pct),
      notes: d.notes ?? null,
    };
  })
  .middleware([requireAdmin])
  .handler(async ({ data, context }) => {
    const sb = context.supabase as SbAny;
    const { error } = await sb
      .from("affiliate_settings")
      .update({ default_commission_pct: data.default_commission_pct, notes: data.notes })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---- Purchase Invoices ----------------------------------------------------
export type PurchaseInvoiceRow = {
  id: string; invoice_number: string | null; invoice_date: string;
  due_date: string | null; total: number; paid_amount: number; remaining: number;
  status: string; supplier_id: string;
  suppliers?: { name: string } | null;
};

export const listPurchaseInvoicesFn = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async ({ context }): Promise<PurchaseInvoiceRow[]> => {
    const sb = context.supabase as SbAny;
    const { data, error } = await sb
      .from("purchase_invoices")
      .select("*, suppliers(name)")
      .order("invoice_date", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return (data ?? []) as PurchaseInvoiceRow[];
  });

// ---- Wallet Top-ups (Maker-Checker) --------------------------------------
export type PendingTopupRow = {
  id: string; user_id: string; amount: number; method: string;
  transfer_reference: string; note: string | null; status: string;
  performed_by: string; performed_by_name: string | null;
  created_at: string; rejection_reason: string | null;
};

export const listPendingTopupsFn = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async ({ context }): Promise<PendingTopupRow[]> => {
    const sb = context.supabase as SbAny;
    const { data, error } = await sb
      .from("wallet_topup_requests")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(50);
    if (error) throw new Error(error.message);
    return (data ?? []) as PendingTopupRow[];
  });

export const approveTopupFn = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => {
    if (!d?.id) throw new Error("id_required");
    return d;
  })
  .middleware([requireAdmin])
  .handler(async ({ data, context }) => {
    const sb = context.supabase as SbAny;
    const { error } = await sb.rpc("approve_wallet_topup", { _topup_id: data.id });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const rejectTopupFn = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; reason: string }) => {
    if (!d?.id) throw new Error("id_required");
    const r = (d.reason ?? "").trim();
    if (r.length < 3) throw new Error("reason_too_short");
    return { id: d.id, reason: r };
  })
  .middleware([requireAdmin])
  .handler(async ({ data, context }) => {
    const sb = context.supabase as SbAny;
    const { error } = await sb.rpc("reject_wallet_topup", { _topup_id: data.id, _reason: data.reason });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export type ProfileSearchRow = { id: string; full_name: string | null; phone: string | null };

export const searchProfilesFn = createServerFn({ method: "GET" })
  .inputValidator((d: { term: string }) => {
    const t = (d?.term ?? "").trim();
    if (t.length < 2) throw new Error("term_too_short");
    // Sanitize ILIKE wildcards to keep the OR filter safe.
    const safe = t.replace(/[%,_]/g, "");
    if (!safe) throw new Error("term_invalid");
    return { term: safe };
  })
  .middleware([requireAdmin])
  .handler(async ({ data, context }): Promise<ProfileSearchRow[]> => {
    const sb = context.supabase as SbAny;
    const { data: rows, error } = await sb
      .from("profiles")
      .select("id, full_name, phone")
      .or(`full_name.ilike.%${data.term}%,phone.ilike.%${data.term}%`)
      .limit(8);
    if (error) throw new Error(error.message);
    return (rows ?? []) as ProfileSearchRow[];
  });

export const getWalletBalanceFn = createServerFn({ method: "GET" })
  .inputValidator((d: { user_id: string }) => {
    if (!d?.user_id) throw new Error("user_required");
    return d;
  })
  .middleware([requireAdmin])
  .handler(async ({ data, context }): Promise<{ balance: number }> => {
    const sb = context.supabase as SbAny;
    const { data: row, error } = await sb
      .from("wallet_balances")
      .select("balance")
      .eq("user_id", data.user_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { balance: Number((row as { balance: number } | null)?.balance ?? 0) };
  });

const TOPUP_METHODS = ["vodafone_cash", "instapay", "bank_transfer", "cash"];

export const adminTopupWalletFn = createServerFn({ method: "POST" })
  .inputValidator((d: {
    user_id: string; amount: number; method: string;
    transfer_reference: string; note: string | null;
  }) => {
    if (!d?.user_id) throw new Error("user_not_found");
    const amt = Number(d.amount);
    if (!Number.isFinite(amt) || amt <= 0) throw new Error("invalid_amount");
    if (amt > 100000) throw new Error("amount_too_large");
    if (!TOPUP_METHODS.includes(d.method)) throw new Error("invalid_method");
    const ref = (d.transfer_reference ?? "").trim();
    if (ref.length < 4) throw new Error("transfer_reference_required");
    return { ...d, amount: amt, transfer_reference: ref, note: d.note?.trim() || null };
  })
  .middleware([requireAdmin])
  .handler(async ({ data, context }) => {
    const sb = context.supabase as SbAny;
    const { error } = await sb.rpc("admin_topup_wallet", {
      _user_id: data.user_id,
      _amount: data.amount,
      _method: data.method,
      _transfer_reference: data.transfer_reference,
      _note: data.note,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---- Product Partners -----------------------------------------------------
export type ProductPartnerRow = {
  id: string; product_id: string; partner_name: string; partner_phone: string | null;
  split_type: "gross_profit" | "net_profit" | "revenue"; percentage: number; is_active: boolean;
  products?: { name: string } | null;
};

export type PartnerLedgerRow = {
  id: string; partner_name: string; product_name: string | null;
  amount_due: number; status: string; created_at: string;
  split_type: string; percentage: number;
};

export const listProductPartnersFn = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async ({ context }): Promise<ProductPartnerRow[]> => {
    const sb = context.supabase as SbAny;
    const { data, error } = await sb
      .from("product_partners")
      .select("*, products(name)")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as ProductPartnerRow[];
  });

export const listPartnerLedgersFn = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async ({ context }): Promise<PartnerLedgerRow[]> => {
    const sb = context.supabase as SbAny;
    const { data, error } = await sb
      .from("partner_ledgers")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return (data ?? []) as PartnerLedgerRow[];
  });

const SPLIT_TYPES = ["gross_profit", "net_profit", "revenue"];

export const createProductPartnerFn = createServerFn({ method: "POST" })
  .inputValidator((d: {
    product_id: string; partner_name: string; partner_phone: string | null;
    split_type: string; percentage: number;
  }) => {
    if (!d?.product_id) throw new Error("product_required");
    const name = (d.partner_name ?? "").trim();
    if (!name) throw new Error("name_required");
    if (!SPLIT_TYPES.includes(d.split_type)) throw new Error("invalid_split");
    const pct = Number(d.percentage);
    if (!Number.isFinite(pct) || pct <= 0 || pct > 100) throw new Error("invalid_pct");
    return {
      product_id: d.product_id,
      partner_name: name,
      partner_phone: d.partner_phone?.trim() || null,
      split_type: d.split_type,
      percentage: pct,
    };
  })
  .middleware([requireAdmin])
  .handler(async ({ data, context }) => {
    const sb = context.supabase as SbAny;
    const { error } = await sb.from("product_partners").insert(data);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setProductPartnerActiveFn = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; is_active: boolean }) => {
    if (!d?.id) throw new Error("id_required");
    return { id: d.id, is_active: !!d.is_active };
  })
  .middleware([requireAdmin])
  .handler(async ({ data, context }) => {
    const sb = context.supabase as SbAny;
    const { error } = await sb.from("product_partners").update({ is_active: data.is_active }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const markPartnerLedgerPaidFn = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => {
    if (!d?.id) throw new Error("id_required");
    return d;
  })
  .middleware([requireAdmin])
  .handler(async ({ data, context }) => {
    const sb = context.supabase as SbAny;
    const { error } = await sb.rpc("admin_update_partner_ledger", {
      p_ledger_id: data.id,
      p_mark_paid: true,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============= Wave R-1 Batch 4 — Zakat Assessments =============
export type ZakatAssessmentRow = {
  id: string;
  period_start: string;
  period_end: string;
  inventory_market_value: number;
  cash_balances: number;
  receivables: number;
  liabilities: number;
  zakat_base: number;
  nisab_value: number;
  zakat_due: number;
  is_above_nisab: boolean;
  status: string;
  created_at: string;
};

export const listZakatAssessmentsFn = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async ({ context }): Promise<ZakatAssessmentRow[]> => {
    const sb = context.supabase as SbAny;
    const { data, error } = await sb
      .from("zakat_assessments")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) throw new Error(error.message);
    return (data ?? []) as ZakatAssessmentRow[];
  });

export const computeZakatAssessmentFn = createServerFn({ method: "POST" })
  .inputValidator((d: { nisab: number }) => {
    const n = Number(d?.nisab);
    if (!Number.isFinite(n) || n <= 0) throw new Error("invalid_nisab");
    return { nisab: n };
  })
  .middleware([requireAdmin])
  .handler(async ({ data, context }): Promise<ZakatAssessmentRow> => {
    const sb = context.supabase as SbAny;
    const { data: out, error } = await sb.rpc("compute_zakat_assessment", { _nisab_value: data.nisab });
    if (error) throw new Error(error.message);
    return out as ZakatAssessmentRow;
  });

// ---- Executive & CFO Dashboards (Wave R-1 · Batch 5) ----------------------
export type ExecutiveDashboardStats = {
  period_days: number;
  orders_count: number;
  gross_sales: number;
  items_revenue: number;
  items_cost: number;
  net_profit: number;
  profit_margin_pct: number;
  top_categories: { category: string; revenue: number; units: number }[];
  low_stock_count: number;
};

export const getExecutiveDashboardStatsFn = createServerFn({ method: "GET" })
  .inputValidator((d: { days: number }) => {
    const n = Number(d?.days);
    if (!Number.isFinite(n) || ![7, 30, 90].includes(n)) throw new Error("invalid_days");
    return { days: n };
  })
  .middleware([requireAdmin])
  .handler(async ({ data, context }): Promise<ExecutiveDashboardStats> => {
    const sb = context.supabase as SbAny;
    const { data: out, error } = await sb.rpc("executive_dashboard_stats", { _days: data.days });
    if (error) throw new Error(error.message);
    return out as ExecutiveDashboardStats;
  });

export type CfoErodedMargin = {
  id: string;
  name: string;
  category: string;
  selling_price: number;
  cost_price: number;
  packaging_cost: number;
  margin: number;
  margin_pct: number;
};
export type CfoDashboardStats = {
  discounts_this_month: number;
  commissions_pending_vest: number;
  commissions_paid_this_month: number;
  wallet_liabilities_total: number;
  eroded_margin_products: CfoErodedMargin[];
  generated_at: string;
};

export const getCfoDashboardStatsFn = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async ({ context }): Promise<CfoDashboardStats> => {
    const sb = context.supabase as SbAny;
    const { data, error } = await sb.rpc("cfo_dashboard_stats");
    if (error) throw new Error(error.message);
    return data as CfoDashboardStats;
  });

// ---- Finance Dashboard (Wave R-1 · Batch 6) -------------------------------
export type FinanceTopSupplier = {
  id: string;
  name: string;
  outstanding_balance: number;
  payment_terms_days: number | null;
};
export type FinanceOverview = {
  revenueToday: number;
  revenue30d: number;
  ordersCompleted: number;
  ordersToday: number;
  suppliersDebt: number;
  overdueSuppliersCount: number;
  expenses30d: number;
  netRoughProfit: number;
  topSuppliers: FinanceTopSupplier[];
};

export const getFinanceOverviewFn = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async ({ context }): Promise<FinanceOverview> => {
    const sb = context.supabase as SbAny;
    const startToday = new Date(); startToday.setHours(0, 0, 0, 0);
    const since30 = new Date(); since30.setDate(since30.getDate() - 30); since30.setHours(0, 0, 0, 0);
    const since30Iso = since30.toISOString();
    const today = new Date().toISOString().slice(0, 10);

    const [ordersRes, suppliersRes, expensesRes, overdueRes, topSupRes] = await Promise.all([
      sb
        .from("salsabil_master_orders")
        .select("id,total_amount,status,created_at, salsabil_fulfillment_nodes!salsabil_fulfillment_nodes_master_fk(status)")
        .gte("created_at", since30Iso),
      sb.from("suppliers").select("outstanding_balance").eq("is_active", true),
      sb.from("daily_expenses").select("amount,expense_date").gte("expense_date", since30Iso.slice(0, 10)),
      sb.from("purchase_invoices").select("id", { count: "exact", head: true })
        .eq("status", "open").lt("due_date", today),
      sb.from("suppliers").select("id,name,outstanding_balance,payment_terms_days")
        .eq("is_active", true).gt("outstanding_balance", 0)
        .order("outstanding_balance", { ascending: false }).limit(6),
    ]);

    const masters: SbAny[] = ordersRes.data ?? [];
    const orders = masters.map((m) => {
      const nodeStatuses: string[] = (m.salsabil_fulfillment_nodes ?? []).map((n: SbAny) => n.status);
      const allDelivered = nodeStatuses.length > 0 && nodeStatuses.every((s) => s === "delivered");
      const allCancelled = nodeStatuses.length > 0 && nodeStatuses.every((s) => s === "cancelled");
      const headline = allDelivered ? "delivered" : allCancelled ? "cancelled" : (m.status ?? "pending");
      return { total: Number(m.total_amount ?? 0), status: headline, created_at: m.created_at };
    });

    const completed = orders.filter((o) => ["delivered", "paid"].includes(o.status));
    const todayOrders = orders.filter((o) => new Date(o.created_at) >= startToday);
    const revenueToday = todayOrders
      .filter((o) => o.status !== "cancelled")
      .reduce((s, o) => s + Number(o.total ?? 0), 0);
    const revenue30d = completed.length
      ? completed.reduce((s, o) => s + Number(o.total ?? 0), 0)
      : orders.filter((o) => o.status !== "cancelled").reduce((s, o) => s + Number(o.total ?? 0), 0);

    const suppliersDebt = (suppliersRes.data ?? [])
      .reduce((s: number, x: SbAny) => s + Number(x.outstanding_balance ?? 0), 0);
    const expenses30d = (expensesRes.data ?? [])
      .reduce((s: number, x: SbAny) => s + Number(x.amount ?? 0), 0);

    return {
      revenueToday,
      revenue30d,
      ordersCompleted: completed.length,
      ordersToday: todayOrders.length,
      suppliersDebt,
      overdueSuppliersCount: overdueRes.count ?? 0,
      expenses30d,
      netRoughProfit: revenue30d - expenses30d,
      topSuppliers: (topSupRes.data ?? []) as FinanceTopSupplier[],
    };
  });

// ---- Admin Dashboard Overview --------------------------------------------
export type AdminDashOrderRow = {
  id: string;
  total: number | null;
  status: string;
  created_at: string;
  user_id: string;
  full_name: string | null;
};
export type AdminDashWeekRow = {
  id: string;
  total: number | null;
  created_at: string;
  status: string;
};
export type AdminDashOverview = {
  bento: {
    todayOrders: number;
    todayRevenue: number;
    inDelivery: number;
    totalCustomers: number;
    lowStock: number;
    partnersDue: number;
  };
  orders: AdminDashOrderRow[];
  week: AdminDashWeekRow[];
  topCats: { label: string; value: number }[];
};

const STATUS_PRIORITY = [
  "pending", "confirmed", "paid", "preparing", "ready",
  "assigned", "picked_up", "out_for_delivery", "delivered", "cancelled",
];
function aggregateStatus(statuses: string[], fallback: string): string {
  if (!statuses.length) return fallback;
  if (statuses.every((s) => s === "delivered")) return "delivered";
  if (statuses.every((s) => s === "cancelled")) return "cancelled";
  const active = statuses.filter((s) => s !== "delivered" && s !== "cancelled");
  const pool = active.length ? active : statuses;
  return pool.reduce((lo, s) =>
    STATUS_PRIORITY.indexOf(s) < STATUS_PRIORITY.indexOf(lo) ? s : lo
  , pool[0]);
}

export const getAdminDashboardOverviewFn = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async ({ context }): Promise<AdminDashOverview> => {
    const sb = context.supabase as SbAny;
    const startToday = new Date(); startToday.setHours(0, 0, 0, 0);
    const start7 = new Date(); start7.setDate(start7.getDate() - 6); start7.setHours(0, 0, 0, 0);

    const [ordersRes, profilesRes, weekRes, catsRes] = await Promise.all([
      sb
        .from("salsabil_master_orders")
        .select("id,total_amount,status,created_at,customer_id, salsabil_fulfillment_nodes!salsabil_fulfillment_nodes_master_fk(status)")
        .order("created_at", { ascending: false })
        .limit(60),
      sb.from("profiles").select("id", { count: "exact", head: true }),
      sb
        .from("salsabil_master_orders")
        .select("id,total_amount,created_at,status, salsabil_fulfillment_nodes!salsabil_fulfillment_nodes_master_fk(status)")
        .gte("created_at", start7.toISOString())
        .order("created_at", { ascending: true }),
      sb
        .from("salsabil_fulfillment_items")
        .select("quantity,price_at_time,created_at, salsabil_skus(salsabil_assets(category_path))")
        .gte("created_at", start7.toISOString())
        .limit(500),
    ]);

    const masters: SbAny[] = Array.isArray(ordersRes?.data) ? ordersRes.data : [];
    const customerIds = Array.from(new Set(masters.map((m) => m.customer_id).filter(Boolean)));
    const nameMap = new Map<string, string | null>();
    if (customerIds.length) {
      const { data: profs } = await sb
        .from("profiles")
        .select("id,full_name")
        .in("id", customerIds);
      (profs ?? []).forEach((p: SbAny) => nameMap.set(p.id, p.full_name));
    }

    const orders: AdminDashOrderRow[] = masters.map((m) => {
      const statuses: string[] = (m.salsabil_fulfillment_nodes ?? []).map((n: SbAny) => n.status);
      return {
        id: m.id,
        total: Number(m.total_amount ?? 0),
        status: aggregateStatus(statuses, m.status ?? "pending"),
        created_at: m.created_at,
        user_id: m.customer_id,
        full_name: nameMap.get(m.customer_id) ?? null,
      };
    });

    const today = orders.filter((o) => new Date(o.created_at) >= startToday);
    const inDelivery = orders.filter((o) =>
      ["out_for_delivery", "preparing", "ready", "confirmed", "assigned", "picked_up"].includes(o.status),
    ).length;
    const todayRev = today.reduce((s, o) => s + Number(o.total ?? 0), 0);

    const items: SbAny[] = Array.isArray(catsRes?.data) ? catsRes.data : [];
    const catMap = new Map<string, number>();
    for (const it of items) {
      const cat = it?.salsabil_skus?.salsabil_assets?.category_path?.split("/")?.[0] ?? "غير مصنّف";
      const lineTotal = Number(it?.price_at_time ?? 0) * Number(it?.quantity ?? 0);
      catMap.set(cat, (catMap.get(cat) ?? 0) + lineTotal);
    }
    const topCats = [...catMap.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    const weekMasters: SbAny[] = Array.isArray(weekRes?.data) ? weekRes.data : [];
    const week: AdminDashWeekRow[] = weekMasters.map((m) => ({
      id: m.id,
      total: Number(m.total_amount ?? 0),
      created_at: m.created_at,
      status: aggregateStatus(
        (m.salsabil_fulfillment_nodes ?? []).map((n: SbAny) => n.status),
        m.status ?? "pending",
      ),
    }));

    return {
      bento: {
        todayOrders: today.length,
        todayRevenue: todayRev,
        inDelivery,
        totalCustomers: profilesRes?.count ?? 0,
        lowStock: 0,
        partnersDue: 0,
      },
      orders,
      week,
      topCats,
    };
  });

// ============================================================================
// Wave R-2 · Batch B.2 — Finance CRUD (Partners, Expenses, Wallet, Affiliate)
// ============================================================================

// ---- Product Partners: Update / Delete -----------------------------------
export const updateProductPartnerFn = createServerFn({ method: "POST" })
  .inputValidator((d: {
    id: string;
    partner_name?: string;
    partner_phone?: string | null;
    split_type?: string;
    percentage?: number;
  }) => {
    if (!d?.id) throw new Error("id_required");
    const out: Record<string, unknown> = { id: d.id };
    if (d.partner_name !== undefined) {
      const name = (d.partner_name ?? "").trim();
      if (!name || name.length > 200) throw new Error("invalid_name");
      out.partner_name = name;
    }
    if (d.partner_phone !== undefined) {
      const ph = d.partner_phone?.trim() || null;
      if (ph && !/^[+0-9 ()-]{4,20}$/.test(ph)) throw new Error("invalid_phone");
      out.partner_phone = ph;
    }
    if (d.split_type !== undefined) {
      if (!SPLIT_TYPES.includes(d.split_type)) throw new Error("invalid_split");
      out.split_type = d.split_type;
    }
    if (d.percentage !== undefined) {
      const pct = Number(d.percentage);
      if (!Number.isFinite(pct) || pct <= 0 || pct > 100) throw new Error("invalid_pct");
      out.percentage = pct;
    }
    return out as { id: string } & Record<string, unknown>;
  })
  .middleware([requireAdmin])
  .handler(async ({ data, context }) => {
    const sb = context.supabase as SbAny;
    const { id, ...patch } = data;
    const { error } = await sb.from("product_partners").update(patch).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const deleteProductPartnerFn = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => {
    if (!d?.id) throw new Error("id_required");
    return d;
  })
  .middleware([requireAdmin])
  .handler(async ({ data, context }) => {
    const sb = context.supabase as SbAny;
    // Soft-delete via is_active=false to preserve ledger integrity.
    const { error } = await sb.from("product_partners").update({ is_active: false }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

// ---- Daily Expenses: Update / Delete -------------------------------------
export const updateExpenseFn = createServerFn({ method: "POST" })
  .inputValidator((d: {
    id: string;
    category?: string;
    subcategory?: string | null;
    amount?: number;
    expense_date?: string;
    paid_to?: string | null;
    payment_method?: string;
    reference?: string | null;
    notes?: string | null;
  }) => {
    if (!d?.id) throw new Error("id_required");
    const patch: Record<string, unknown> = {};
    if (d.category !== undefined) {
      if (!EXPENSE_CATEGORIES.includes(d.category)) throw new Error("invalid_category");
      patch.category = d.category;
    }
    if (d.payment_method !== undefined) {
      if (!EXPENSE_METHODS.includes(d.payment_method)) throw new Error("invalid_method");
      patch.payment_method = d.payment_method;
    }
    if (d.amount !== undefined) {
      const a = Number(d.amount);
      if (!Number.isFinite(a) || a <= 0) throw new Error("invalid_amount");
      patch.amount = a;
    }
    if (d.expense_date !== undefined) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d.expense_date)) throw new Error("invalid_date");
      patch.expense_date = d.expense_date;
    }
    if (d.subcategory !== undefined) patch.subcategory = d.subcategory?.trim() || null;
    if (d.paid_to !== undefined) patch.paid_to = d.paid_to?.trim() || null;
    if (d.reference !== undefined) patch.reference = d.reference?.trim() || null;
    if (d.notes !== undefined) patch.notes = d.notes?.trim() || null;
    return { id: d.id, patch };
  })
  .middleware([requireAdmin])
  .handler(async ({ data, context }) => {
    const sb = context.supabase as SbAny;
    const { error } = await sb.from("daily_expenses").update(data.patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const deleteExpenseFn = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => {
    if (!d?.id) throw new Error("id_required");
    return d;
  })
  .middleware([requireAdmin])
  .handler(async ({ data, context }) => {
    const sb = context.supabase as SbAny;
    const { error } = await sb.from("daily_expenses").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

// ---- Affiliate Settings: Delete ------------------------------------------
export const deleteAffiliateSettingFn = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => {
    if (!d?.id) throw new Error("id_required");
    return d;
  })
  .middleware([requireAdmin])
  .handler(async ({ data, context }) => {
    const sb = context.supabase as SbAny;
    const { error } = await sb.from("affiliate_settings").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

// ---- Wallet Adjustments (Manual Admin Debit/Credit) ----------------------
const WALLET_ADJUST_KINDS = ["credit", "debit"] as const;

export const adminAdjustWalletFn = createServerFn({ method: "POST" })
  .inputValidator((d: {
    user_id: string;
    kind: "credit" | "debit";
    amount: number;
    label: string;
    note?: string | null;
  }) => {
    if (!d?.user_id || !/^[0-9a-f-]{36}$/i.test(d.user_id)) throw new Error("invalid_user_id");
    if (!WALLET_ADJUST_KINDS.includes(d.kind)) throw new Error("invalid_kind");
    const amt = Number(d.amount);
    if (!Number.isFinite(amt) || amt <= 0) throw new Error("invalid_amount");
    if (amt > 1_000_000) throw new Error("amount_too_large");
    const label = (d.label ?? "").trim();
    if (label.length < 3 || label.length > 200) throw new Error("invalid_label");
    return { user_id: d.user_id, kind: d.kind, amount: amt, label, note: d.note?.trim() || null };
  })
  .middleware([requireAdmin])
  .handler(async ({ data, context }) => {
    const sb = context.supabase as SbAny;
    const { data: row, error } = await sb
      .from("wallet_transactions")
      .insert({
        user_id: data.user_id,
        kind: data.kind,
        amount: data.amount,
        label: data.label,
        source: data.note ? `admin_adjustment: ${data.note}` : "admin_adjustment",
        status: "cleared",
        created_by_admin: context.userId,
        approved_by: context.userId,
        approved_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    // Recompute the user's balance snapshot.
    await sb.rpc("recompute_wallet_balance", { _user_id: data.user_id });
    return { id: row.id as string };
  });

export const reverseWalletEntryFn = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; reason: string }) => {
    if (!d?.id || !/^[0-9a-f-]{36}$/i.test(d.id)) throw new Error("invalid_id");
    const r = (d.reason ?? "").trim();
    if (r.length < 3 || r.length > 300) throw new Error("invalid_reason");
    return { id: d.id, reason: r };
  })
  .middleware([requireAdmin])
  .handler(async ({ data, context }) => {
    const sb = context.supabase as SbAny;
    const { data: orig, error: fe } = await sb
      .from("wallet_transactions")
      .select("id, user_id, kind, amount, label, status")
      .eq("id", data.id)
      .maybeSingle();
    if (fe) throw new Error(fe.message);
    if (!orig) throw new Error("entry_not_found");
    if (orig.status === "reversed") throw new Error("already_reversed");
    const opposite = orig.kind === "credit" ? "debit" : "credit";

    const { error: insErr } = await sb.from("wallet_transactions").insert({
      user_id: orig.user_id,
      kind: opposite,
      amount: orig.amount,
      label: `REVERSAL: ${orig.label}`,
      source: `admin_reversal:${data.id}:${data.reason}`,
      status: "cleared",
      created_by_admin: context.userId,
      approved_by: context.userId,
      approved_at: new Date().toISOString(),
    });
    if (insErr) throw new Error(insErr.message);

    const { error: upErr } = await sb
      .from("wallet_transactions")
      .update({ status: "reversed" })
      .eq("id", data.id);
    if (upErr) throw new Error(upErr.message);

    await sb.rpc("recompute_wallet_balance", { _user_id: orig.user_id });
    return { ok: true as const };
  });
