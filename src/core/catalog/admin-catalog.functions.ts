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
  payment_terms_days: number | null;
  is_active: boolean;
};

export const listSuppliersFullFn = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async ({ context }): Promise<SupplierFullRow[]> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = asDynamic(context.supabase);
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
    const sb = asDynamic(context.supabase);
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

// ============= Wave R-1 Batch 2 — Product Units =============
export type UoMRow = { code: string; name_ar: string; is_base: boolean; sort_order: number };
export type ProductUnitRow = {
  id?: string;
  product_id: string;
  unit_code: string;
  conversion_factor: number;
  selling_price: number | null;
  is_default_sell: boolean;
  is_active: boolean;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SbAnyPU = any;

export const listUnitsOfMeasureFn = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async ({ context }): Promise<UoMRow[]> => {
    const sb = context.supabase as SbAnyPU;
    const { data, error } = await sb
      .from("units_of_measure")
      .select("*")
      .order("sort_order")
      .limit(500);
    if (error) throw new Error(error.message);
    return (data ?? []) as UoMRow[];
  });

export const listProductUnitsForProductFn = createServerFn({ method: "GET" })
  .inputValidator((d: { productId: string }) => {
    if (!d?.productId) throw new Error("productId_required");
    return d;
  })
  .middleware([requireAdmin])
  .handler(async ({ data, context }): Promise<ProductUnitRow[]> => {
    const sb = context.supabase as SbAnyPU;
    const { data: rows, error } = await sb
      .from("product_units")
      .select("*")
      .eq("product_id", data.productId)
      .order("conversion_factor")
      .limit(500);
    if (error) throw new Error(error.message);
    return (rows ?? []) as ProductUnitRow[];
  });

export const upsertProductUnitsFn = createServerFn({ method: "POST" })
  .inputValidator((d: { rows: ProductUnitRow[] }) => {
    if (!Array.isArray(d?.rows)) throw new Error("rows_required");
    return d;
  })
  .middleware([requireAdmin])
  .handler(async ({ data, context }) => {
    const sb = context.supabase as SbAnyPU;
    // Validate pricing per unit server-side using existing RPC.
    for (const r of data.rows) {
      if (r.selling_price && r.selling_price > 0) {
        const { data: v } = await sb.rpc("validate_unit_pricing", {
          _product_id: r.product_id,
          _unit_code: r.unit_code,
          _selling_price: r.selling_price,
        });
        const vv = v as { ok?: boolean; message?: string } | null;
        if (vv && vv.ok === false) {
          throw new Error(`${r.unit_code}: ${vv.message ?? "تسعير غير صالح"}`);
        }
      }
    }
    const payload = data.rows.map((r) => ({
      ...(r.id ? { id: r.id } : {}),
      product_id: r.product_id,
      unit_code: r.unit_code,
      conversion_factor: r.conversion_factor,
      selling_price: r.selling_price,
      is_default_sell: r.is_default_sell,
      is_active: r.is_active,
    }));
    const { error } = await sb
      .from("product_units")
      .upsert(payload, { onConflict: "product_id,unit_code" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteProductUnitFn = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => {
    if (!d?.id) throw new Error("id_required");
    return d;
  })
  .middleware([requireAdmin])
  .handler(async ({ data, context }) => {
    const sb = context.supabase as SbAnyPU;
    const { error } = await sb.from("product_units").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---- Universal Salsabil Assets (USA) — Wave R-1 · Batch 7 ---------------
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SbAnyUSA = any;

export type AssetSkuRow = { id: string; sku_code: string };

export const listAssetSkusFn = createServerFn({ method: "GET" })
  .inputValidator((d: { asset_id: string }) => {
    const id = String(d?.asset_id ?? "").trim();
    if (!id) throw new Error("asset_id_required");
    return { asset_id: id };
  })
  .middleware([requireAdmin])
  .handler(async ({ data, context }): Promise<AssetSkuRow[]> => {
    const sb = context.supabase as SbAnyUSA;
    const { data: rows, error } = await sb
      .from("salsabil_skus")
      .select("id, sku_code")
      .eq("asset_id", data.asset_id)
      .order("sort_order", { ascending: true });
    if (error) throw new Error(error.message);
    return (rows ?? []) as AssetSkuRow[];
  });

export const mintUniversalAssetFn = createServerFn({ method: "POST" })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  .inputValidator((d: { payload: any }) => {
    if (!d?.payload || typeof d.payload !== "object") throw new Error("payload_required");
    return { payload: d.payload };
  })
  .middleware([requireAdmin])
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    const sb = context.supabase as SbAnyUSA;
    const { data: id, error } = await sb.rpc("mint_universal_asset", { payload: data.payload });
    if (error) throw new Error(error.message ?? "mint_failed");
    return { id: String(id) };
  });

// ============= Wave R-2 Batch B.1 — Supplier Update / Soft Delete =============
export type SupplierUpdateInput = {
  id: string;
  name?: string;
  contact_phone?: string | null;
  closing_day?: number | null;
  collection_days?: number[];
  payment_terms_days?: number;
  is_active?: boolean;
};

export const updateSupplierFn = createServerFn({ method: "POST" })
  .inputValidator((d: SupplierUpdateInput) => {
    if (!d?.id) throw new Error("id_required");
    const out: SupplierUpdateInput = { id: String(d.id) };
    if (d.name !== undefined) {
      const n = String(d.name).trim();
      if (!n || n.length > 200) throw new Error("invalid_name");
      out.name = n;
    }
    if (d.contact_phone !== undefined) {
      const p = d.contact_phone == null ? null : String(d.contact_phone).trim();
      if (p && !/^[+0-9 \-()]{6,20}$/.test(p)) throw new Error("invalid_phone");
      out.contact_phone = p;
    }
    if (d.closing_day !== undefined) {
      if (d.closing_day !== null && (!Number.isInteger(d.closing_day) || d.closing_day < 1 || d.closing_day > 31)) {
        throw new Error("invalid_closing_day");
      }
      out.closing_day = d.closing_day;
    }
    if (d.collection_days !== undefined) {
      if (!Array.isArray(d.collection_days) || d.collection_days.some((x) => !Number.isInteger(x) || x < 0 || x > 6)) {
        throw new Error("invalid_collection_days");
      }
      out.collection_days = d.collection_days;
    }
    if (d.payment_terms_days !== undefined) {
      if (!Number.isInteger(d.payment_terms_days) || d.payment_terms_days < 0 || d.payment_terms_days > 365) {
        throw new Error("invalid_payment_terms_days");
      }
      out.payment_terms_days = d.payment_terms_days;
    }
    if (d.is_active !== undefined) out.is_active = !!d.is_active;
    return out;
  })
  .middleware([requireAdmin])
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = asDynamic(context.supabase);
    const { id, ...patch } = data;
    if (Object.keys(patch).length === 0) return { ok: true };
    const { error } = await sb.from("suppliers").update(patch).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setSupplierActiveFn = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; is_active: boolean }) => {
    if (!d?.id) throw new Error("id_required");
    return { id: String(d.id), is_active: !!d.is_active };
  })
  .middleware([requireAdmin])
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = asDynamic(context.supabase);
    const { error } = await sb.from("suppliers").update({ is_active: data.is_active }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteSupplierFn = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => {
    if (!d?.id) throw new Error("id_required");
    return { id: String(d.id) };
  })
  .middleware([requireAdmin])
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = asDynamic(context.supabase);
    // Soft delete: deactivate first; hard delete only if no references — let DB constraints decide.
    const { error } = await sb.from("suppliers").update({ is_active: false }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
