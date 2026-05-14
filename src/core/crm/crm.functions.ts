// CRM Gateway — Wave P-D · Phase D-8.
// Customer 360 aggregator + admin notification broadcaster, gated by `requireAdmin`.
import { createServerFn } from "@tanstack/react-start";
import { requireAdmin } from "@/integrations/supabase/admin-middleware";
import { asDynamic } from "@/integrations/supabase/dynamic";

// ---- Types ----------------------------------------------------------------
export type CrmProfile = {
  id: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
  occupation: string | null;
  household_size: number | null;
  preferred_locale: string | null;
};

export type CrmWallet = {
  balance: number;
  points: number;
  cashback: number;
  coupons: number;
};

export type CrmStats = {
  total_spent: number;
  orders_count: number;
  last_order_at: string | null;
};

export type CrmOrder = {
  id: string;
  total: number;
  status: string;
  created_at: string;
};

export type Customer360 = {
  profile: CrmProfile | null;
  wallet: CrmWallet;
  stats: CrmStats;
  orders: CrmOrder[];
};

export type BroadcastSegment = "all" | "vip";

export type BroadcastResult = { recipients: number };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SbAny = any;

const ZERO_WALLET: CrmWallet = { balance: 0, points: 0, cashback: 0, coupons: 0 };

// ---- Customer 360 ---------------------------------------------------------
export const getCustomer360Fn = createServerFn({ method: "GET" })
  .inputValidator((d: { customerId: string }) => {
    if (!d?.customerId) throw new Error("invalid_customer_id");
    return d;
  })
  .middleware([requireAdmin])
  .handler(async ({ data, context }): Promise<Customer360> => {
    const sb = context.supabase as SbAny;
    const customerId = data.customerId;

    const [prof, wal, ord] = await Promise.all([
      sb
        .from("profiles")
        .select("id, full_name, phone, avatar_url, created_at, occupation, household_size, preferred_locale")
        .eq("id", customerId)
        .maybeSingle(),
      sb
        .from("wallet_balances")
        .select("balance, points, cashback, coupons")
        .eq("user_id", customerId)
        .maybeSingle(),
      sb
        .from("salsabil_master_orders")
        .select("id, total_amount, status, created_at, salsabil_fulfillment_nodes!salsabil_fulfillment_nodes_master_fk(status)")
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false })
        .limit(100),
    ]);

    if (prof.error) throw new Error(prof.error.message);
    if (wal.error) throw new Error(wal.error.message);
    if (ord.error) throw new Error(ord.error.message);

    const rawOrders = (ord.data ?? []) as Array<{
      id: string;
      total_amount: number | null;
      status: string | null;
      created_at: string;
      salsabil_fulfillment_nodes?: Array<{ status: string }> | null;
    }>;

    const orders: CrmOrder[] = rawOrders.map((m) => {
      const nodes = m.salsabil_fulfillment_nodes ?? [];
      const statuses = nodes.map((n) => n.status);
      const headline =
        statuses.length === 0
          ? m.status ?? "pending"
          : statuses.every((s) => s === "delivered")
            ? "delivered"
            : statuses.every((s) => s === "cancelled")
              ? "cancelled"
              : statuses.find((s) => !["delivered", "cancelled"].includes(s)) ?? m.status ?? "pending";
      return {
        id: m.id,
        total: Number(m.total_amount ?? 0),
        status: headline,
        created_at: m.created_at,
      };
    });

    const total_spent = orders.reduce((sum, o) => sum + o.total, 0);
    const last_order_at = orders.length
      ? orders.map((o) => o.created_at).sort().slice(-1)[0]
      : null;

    return {
      profile: (prof.data as CrmProfile | null) ?? null,
      wallet: (wal.data as CrmWallet | null) ?? ZERO_WALLET,
      stats: { total_spent, orders_count: orders.length, last_order_at },
      orders,
    };
  });

// ---- Notification broadcast ----------------------------------------------
export const broadcastNotificationFn = createServerFn({ method: "POST" })
  .inputValidator((d: { title: string; body: string | null; segment: BroadcastSegment }) => {
    if (!d?.title?.trim()) throw new Error("invalid_title");
    if (d.segment !== "all" && d.segment !== "vip") throw new Error("invalid_segment");
    return d;
  })
  .middleware([requireAdmin])
  .handler(async ({ data, context }): Promise<BroadcastResult> => {
    const sb = context.supabase as SbAny;

    let userIds: string[] = [];
    if (data.segment === "vip") {
      const { data: rows, error } = await sb
        .from("salsabil_master_orders")
        .select("customer_id")
        .eq("status", "delivered")
        .limit(2000);
      if (error) throw new Error(error.message);
      const counts: Record<string, number> = {};
      ((rows ?? []) as Array<{ customer_id: string | null }>).forEach((o) => {
        if (o.customer_id) counts[o.customer_id] = (counts[o.customer_id] || 0) + 1;
      });
      userIds = Object.entries(counts).filter(([, c]) => c >= 20).map(([uid]) => uid);
    } else {
      const { data: rows, error } = await sb.from("profiles").select("id").limit(5000);
      if (error) throw new Error(error.message);
      userIds = ((rows ?? []) as Array<{ id: string | null }>)
        .map((p) => p.id)
        .filter((id): id is string => !!id);
    }

    if (userIds.length === 0) throw new Error("no_recipients");

    const title = data.title.trim();
    const body = data.body?.trim() || null;
    const rows = userIds.map((uid) => ({
      user_id: uid,
      title,
      body,
      icon: "bell",
    }));

    for (let i = 0; i < rows.length; i += 500) {
      const { error } = await sb.from("notifications").insert(rows.slice(i, i + 500));
      if (error) throw new Error(error.message);
    }

    return { recipients: userIds.length };
  });

// ---- Wave R-1 Batch 1 additions ------------------------------------------
export type CustomerListRow = {
  id: string;
  full_name: string | null;
  phone: string | null;
  birth_date: string | null;
  gender: string | null;
  budget_range: string | null;
  created_at: string;
};

export const listCustomersFn = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async ({ context }): Promise<CustomerListRow[]> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = asDynamic(context.supabase);
    const { data, error } = await sb
      .from("profiles")
      .select("id,full_name,phone,birth_date,gender,budget_range,created_at")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return (data ?? []) as CustomerListRow[];
  });

// ---- Support Tickets ------------------------------------------------------
export const closeSupportTicketFn = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => {
    if (!d?.id) throw new Error("id_required");
    return d;
  })
  .middleware([requireAdmin])
  .handler(async ({ data, context }) => {
    const sb = context.supabase as SbAny;
    const { error } = await sb
      .from("support_tickets")
      .update({ status: "resolved", resolved_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============= Wave R-1 Batch 4 — Human Directory =============
export type HumanProfile = {
  id: string;
  full_name: string | null;
  phone: string | null;
  governorate: string | null;
  created_at: string;
};
export type HumanRelationship = { profile_id: string; kind: string };
export type HumanDirectoryState = {
  profiles: HumanProfile[];
  relationships: HumanRelationship[];
};

export const listHumanDirectoryFn = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async ({ context }): Promise<HumanDirectoryState> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = asDynamic(context.supabase);
    const [{ data: profs, error: e1 }, { data: rels, error: e2 }] = await Promise.all([
      sb.from("profiles")
        .select("id,full_name,phone,governorate,created_at")
        .order("created_at", { ascending: false })
        .limit(500),
      sb.from("human_relationships").select("profile_id,kind").limit(5000),
    ]);
    if (e1) throw new Error(e1.message);
    if (e2) throw new Error(e2.message);
    return {
      profiles: (profs ?? []) as HumanProfile[],
      relationships: (rels ?? []) as HumanRelationship[],
    };
  });

// ============= Wave R-2 Batch A.2 — Human 360 Sheet =============
export type Human360Result = {
  identity: {
    id: string;
    full_name: string | null;
    phone: string | null;
    governorate: string | null;
    city: string | null;
    is_kyc_verified: boolean;
    loyalty_tier: string;
  };
  relationships: string[];
  customer: { lifetime_spend: number; loyalty_points: number; loyalty_tier: string };
  vendor: {
    legacy_vendors: Array<{ id: string; name: string; type: string; commission_pct: number; is_active: boolean }>;
    salsabil_memberships: Array<{ vendor_id: string; business_name: string; role: string; is_active: boolean }>;
    wallet_available: number;
  };
  staff: {
    roles: Array<{ role: string; branch_id: string | null; is_active: boolean }>;
    open_advances: Array<{ id: string; kind: string; amount: number; status: string; created_at: string }>;
    open_advance_total: number;
  };
  partner: {
    partnerships: Array<{ id: string; product_id: string; split_type: string; percentage: number; is_active: boolean }>;
    amount_due: number;
    amount_paid: number;
  };
  capabilities: Array<{ workspace_id: string; workspace_kind: string | null; capability: string; expires_at: string | null }>;
};

export const getHuman360Fn = createServerFn({ method: "GET" })
  .inputValidator((d: { profileId: string }) => {
    const id = String(d?.profileId ?? "").trim();
    if (!id) throw new Error("profile_id_required");
    return { profileId: id };
  })
  .middleware([requireAdmin])
  .handler(async ({ data, context }): Promise<Human360Result> => {
    const sb = context.supabase as SbAny;
    const { data: out, error } = await sb.rpc("get_human_360", { p_profile_id: data.profileId });
    if (error) throw new Error(error.message);
    if (out && typeof out === "object" && "error" in out && (out as { error: unknown }).error) {
      throw new Error(String((out as { error: unknown }).error));
    }
    return out as Human360Result;
  });

// ============= Wave R-2 Batch B.1 — Human CRUD =============
export type HumanCreateInput = {
  full_name: string;
  phone?: string | null;
  governorate?: string | null;
  city?: string | null;
  gender?: string | null;
  birth_date?: string | null;
  occupation?: string | null;
};

export type HumanUpdateInput = HumanCreateInput & { id: string };

const PHONE_RE = /^[+0-9 \-()]{6,20}$/;

function validateHumanPayload<T extends Partial<HumanCreateInput>>(d: T): T {
  if (d.full_name !== undefined) {
    const n = String(d.full_name ?? "").trim();
    if (!n || n.length < 2 || n.length > 120) throw new Error("invalid_full_name");
    d.full_name = n;
  }
  if (d.phone) {
    const p = String(d.phone).trim();
    if (!PHONE_RE.test(p)) throw new Error("invalid_phone");
    d.phone = p;
  }
  if (d.governorate && String(d.governorate).length > 80) throw new Error("invalid_governorate");
  if (d.city && String(d.city).length > 80) throw new Error("invalid_city");
  if (d.gender && !["male", "female", "other"].includes(String(d.gender))) throw new Error("invalid_gender");
  if (d.birth_date && !/^\d{4}-\d{2}-\d{2}$/.test(String(d.birth_date))) throw new Error("invalid_birth_date");
  if (d.occupation && String(d.occupation).length > 120) throw new Error("invalid_occupation");
  return d;
}

export const createHumanFn = createServerFn({ method: "POST" })
  .inputValidator((d: HumanCreateInput) => {
    if (!d?.full_name) throw new Error("full_name_required");
    return validateHumanPayload({ ...d });
  })
  .middleware([requireAdmin])
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    const sb = context.supabase as SbAny;
    const id = (globalThis.crypto as Crypto).randomUUID();
    const { data: row, error } = await sb
      .from("profiles")
      .insert({
        id,
        full_name: data.full_name,
        phone: data.phone ?? null,
        governorate: data.governorate ?? null,
        city: data.city ?? null,
        gender: data.gender ?? null,
        birth_date: data.birth_date ?? null,
        occupation: data.occupation ?? null,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id as string };
  });

export const updateHumanFn = createServerFn({ method: "POST" })
  .inputValidator((d: HumanUpdateInput) => {
    if (!d?.id) throw new Error("id_required");
    const { id: _id, ...rest } = d;
    return { ...validateHumanPayload({ ...rest }), id: String(d.id) };
  })
  .middleware([requireAdmin])
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const sb = context.supabase as SbAny;
    const { id, ...patch } = data;
    const { error } = await sb
      .from("profiles")
      .update({
        ...patch,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteHumanFn = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => {
    if (!d?.id) throw new Error("id_required");
    return { id: String(d.id) };
  })
  .middleware([requireAdmin])
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const sb = context.supabase as SbAny;
    const { error } = await sb.from("profiles").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
