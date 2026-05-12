// Admin Catalog Master-Data Gateway — Wave P-D · Phase D-6.
// Sanctioned `createServerFn` handlers covering categories, stores, branches,
// suppliers and the atomic `submit_purchase_invoice` RPC. All handlers are
// gated by `requireAdmin`, which composes `requireSupabaseAuth` and verifies
// the `admin` role via the `has_role` security-definer RPC.
import { createServerFn } from "@tanstack/react-start";
import { requireAdmin } from "@/integrations/supabase/admin-middleware";

// ---- Types ----------------------------------------------------------------
export type CategoryRow = {
  id: string;
  name: string;
  parent_id: string | null;
  icon: string | null;
  sort_order: number;
};

export type CategoryInput = {
  name: string;
  parent_id: string | null;
  icon: string | null;
  sort_order: number;
};

export type StoreRow = {
  id: string;
  name: string;
  slug: string;
  type: string;
  phone: string | null;
  address: string | null;
  logo_url: string | null;
  commission_pct: number;
  is_active: boolean;
};

export type StoreInput = {
  name: string;
  slug: string;
  type: string;
  phone: string | null;
  address: string | null;
  logo_url: string | null;
  commission_pct: number;
  is_active: boolean;
};

export type BranchRow = {
  id: string;
  code: string;
  name: string;
  country: string;
  country_code: string;
  currency: string;
  timezone: string;
  default_locale: string;
  supported_locales: string[];
  is_active: boolean;
};

export type BranchInput = {
  code: string;
  name: string;
  country: string;
  country_code: string;
  currency: string;
  timezone: string;
  default_locale: string;
  supported_locales: string[];
};

export type SupplierRow = { id: string; name: string };

export type PurchaseInvoiceLine = {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_cost: number;
};

export type SubmitPurchaseInvoiceInput = {
  supplier_id: string;
  items: PurchaseInvoiceLine[];
  total_amount: number;
  invoice_number?: string;
  invoice_date: string;
  paid_amount: number;
  tax: number;
  notes?: string;
};

// ---- Loose helper types ---------------------------------------------------
type SbResult<T> = { data: T | null; error: { message: string } | null };
type SbAny = {
  from: (t: string) => {
    select: (s: string, opts?: Record<string, unknown>) => {
      eq?: (c: string, v: unknown) => {
        order?: (c: string, o: { ascending: boolean }) => {
          limit: (n: number) => Promise<SbResult<unknown[]>>;
        };
      };
      order: (c: string, o: { ascending: boolean }) => {
        limit: (n: number) => Promise<SbResult<unknown[]>>;
      };
    };
    insert: (v: Record<string, unknown>) => Promise<{ error: { message: string } | null }>;
    update: (v: Record<string, unknown>) => {
      eq: (c: string, v: string) => Promise<{ error: { message: string } | null }>;
    };
    delete: () => {
      eq: (c: string, v: string) => Promise<{ error: { message: string } | null }>;
    };
  };
  rpc: (fn: string, args: Record<string, unknown>) => Promise<SbResult<unknown>>;
};

// ---- Categories -----------------------------------------------------------
export const listCategoriesFn = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async ({ context }): Promise<CategoryRow[]> => {
    const sb = context.supabase as unknown as SbAny;
    const { data, error } = await sb
      .from("categories")
      .select("id, name, parent_id, icon, sort_order")
      .order("sort_order", { ascending: true })
      .limit(500);
    if (error) throw new Error(error.message);
    return (data as CategoryRow[] | null) ?? [];
  });

export const upsertCategoryFn = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string | null; values: CategoryInput }) => {
    if (!d.values?.name?.trim()) throw new Error("invalid_name");
    return d;
  })
  .middleware([requireAdmin])
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as SbAny;
    const payload = {
      name: data.values.name.trim(),
      parent_id: data.values.parent_id,
      icon: data.values.icon,
      sort_order: Number(data.values.sort_order) || 0,
    };
    const res = data.id
      ? await sb.from("categories").update(payload).eq("id", data.id)
      : await sb.from("categories").insert(payload);
    if (res.error) throw new Error(res.error.message);
    return { ok: true as const };
  });

export const deleteCategoryFn = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => d)
  .middleware([requireAdmin])
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as SbAny;
    const { error } = await sb.from("categories").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

// ---- Stores ---------------------------------------------------------------
export const listStoresFn = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async ({ context }): Promise<StoreRow[]> => {
    const sb = context.supabase as unknown as SbAny;
    const { data, error } = await sb
      .from("stores")
      .select("id, name, slug, type, phone, address, logo_url, commission_pct, is_active")
      .order("name", { ascending: true })
      .limit(1000);
    if (error) throw new Error(error.message);
    return (data as StoreRow[] | null) ?? [];
  });

export const upsertStoreFn = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string | null; values: StoreInput }) => {
    if (!d.values?.name?.trim()) throw new Error("invalid_name");
    if (!d.values?.slug?.trim()) throw new Error("invalid_slug");
    return d;
  })
  .middleware([requireAdmin])
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as SbAny;
    const v = data.values;
    const payload = {
      name: v.name.trim(),
      slug: v.slug.trim(),
      type: v.type,
      phone: v.phone || null,
      address: v.address || null,
      logo_url: v.logo_url || null,
      commission_pct: Number(v.commission_pct) || 0,
      is_active: !!v.is_active,
    };
    const res = data.id
      ? await sb.from("stores").update(payload).eq("id", data.id)
      : await sb.from("stores").insert(payload);
    if (res.error) throw new Error(res.error.message);
    return { ok: true as const };
  });

export const deleteStoreFn = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => d)
  .middleware([requireAdmin])
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as SbAny;
    const { error } = await sb.from("stores").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

// ---- Branches -------------------------------------------------------------
export const listBranchesFn = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async ({ context }): Promise<BranchRow[]> => {
    const sb = context.supabase as unknown as SbAny;
    const { data, error } = await sb
      .from("branches")
      .select("id, code, name, country, country_code, currency, timezone, default_locale, supported_locales, is_active")
      .order("created_at", { ascending: true })
      .limit(1000);
    if (error) throw new Error(error.message);
    return (data as BranchRow[] | null) ?? [];
  });

export const upsertBranchFn = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string | null; values: BranchInput }) => {
    if (!d.values?.code?.trim()) throw new Error("invalid_code");
    if (!d.values?.name?.trim()) throw new Error("invalid_name");
    if (!d.values?.country_code?.trim()) throw new Error("invalid_country_code");
    return d;
  })
  .middleware([requireAdmin])
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as SbAny;
    const v = data.values;
    const payload = {
      code: v.code.trim(),
      name: v.name.trim(),
      country: v.country,
      country_code: v.country_code.toUpperCase(),
      currency: v.currency,
      timezone: v.timezone,
      default_locale: v.default_locale,
      supported_locales: v.supported_locales,
    };
    const res = data.id
      ? await sb.from("branches").update(payload).eq("id", data.id)
      : await sb.from("branches").insert(payload);
    if (res.error) throw new Error(res.error.message);
    return { ok: true as const };
  });

export const setBranchActiveFn = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; is_active: boolean }) => d)
  .middleware([requireAdmin])
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as SbAny;
    const { error } = await sb
      .from("branches")
      .update({ is_active: data.is_active })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const deleteBranchFn = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => d)
  .middleware([requireAdmin])
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as SbAny;
    const { error } = await sb.from("branches").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

// ---- Suppliers ------------------------------------------------------------
export const listSuppliersFn = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async ({ context }): Promise<SupplierRow[]> => {
    const sb = context.supabase as unknown as SbAny;
    const sel = sb.from("suppliers").select("id, name");
    const eq = sel.eq?.("is_active", true);
    const ordered = eq?.order?.("name", { ascending: true })?.limit(1000);
    if (!ordered) throw new Error("supplier_query_misconfigured");
    const { data, error } = await ordered;
    if (error) throw new Error(error.message);
    return (data as SupplierRow[] | null) ?? [];
  });

// ---- Purchase invoice -----------------------------------------------------
export const submitPurchaseInvoiceFn = createServerFn({ method: "POST" })
  .inputValidator((d: SubmitPurchaseInvoiceInput) => {
    if (!d.supplier_id) throw new Error("supplier_required");
    if (!Array.isArray(d.items) || d.items.length === 0) throw new Error("invalid_items");
    for (const l of d.items) {
      if (!l.product_id || !l.product_name) throw new Error("invalid_line");
      if (!(l.quantity > 0) || !(l.unit_cost >= 0)) throw new Error("invalid_line");
    }
    return d;
  })
  .middleware([requireAdmin])
  .handler(async ({ data, context }): Promise<{ invoice_id: string | null }> => {
    const sb = context.supabase as unknown as SbAny;
    const { data: result, error } = await sb.rpc("submit_purchase_invoice", {
      _supplier_id: data.supplier_id,
      _items: data.items,
      _total_amount: data.total_amount,
      _invoice_number: data.invoice_number || undefined,
      _invoice_date: data.invoice_date,
      _paid_amount: data.paid_amount,
      _tax: data.tax,
      _notes: data.notes || undefined,
    });
    if (error) throw new Error(error.message);
    const invoiceId = (result as { invoice_id?: string } | null)?.invoice_id ?? null;
    return { invoice_id: invoiceId };
  });

// ---- Wave R-1 Batch 1: full supplier admin -------------------------------
export type SupplierFullRow = {
  id: string;
  name: string;
  contact_phone: string | null;
  closing_day: number | null;
  collection_days: number[] | null;
  outstanding_balance: number;
  total_purchased: number;
  total_paid: number;
  is_active: boolean;
};

export const listSuppliersFullFn = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async ({ context }): Promise<SupplierFullRow[]> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = context.supabase as any;
    const { data, error } = await sb
      .from("suppliers")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1000);
    if (error) throw new Error(error.message);
    return (data ?? []) as SupplierFullRow[];
  });

export type SupplierCreateInput = {
  name: string;
  contact_phone: string | null;
  closing_day: number | null;
  collection_days: number[];
  payment_terms_days: number;
};

export const createSupplierFn = createServerFn({ method: "POST" })
  .inputValidator((d: SupplierCreateInput) => {
    if (!d?.name?.trim()) throw new Error("name_required");
    return d;
  })
  .middleware([requireAdmin])
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = context.supabase as any;
    const { data: row, error } = await sb
      .from("suppliers")
      .insert({
        name: data.name.trim(),
        contact_phone: data.contact_phone || null,
        closing_day: data.closing_day,
        collection_days: data.collection_days,
        payment_terms_days: data.payment_terms_days || 30,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id as string };
  });
