// Marketing Gateway — Wave P-D · Phase D-7.
// Sanctioned `createServerFn` handlers for banners, coupons, and flash sales.
// All gated by `requireAdmin`.
import { createServerFn } from "@tanstack/react-start";
import { requireAdmin } from "@/integrations/supabase/admin-middleware";

// ---- Types ----------------------------------------------------------------
export type BannerRow = {
  id: string;
  title: string;
  subtitle: string | null;
  image_url: string;
  placement: string;
  link_url: string | null;
  category_slug: string | null;
  sort_order: number;
  is_active: boolean;
};

export type BannerInput = Omit<BannerRow, "id">;

export type CouponRow = {
  id: string;
  code: string;
  description: string | null;
  discount_pct: number;
  discount_amount: number | null;
  min_order_total: number | null;
  min_user_level: string;
  per_user_limit: number;
  max_uses: number | null;
  uses_count: number | null;
  ends_at: string | null;
  is_active: boolean;
};

export type CouponInput = {
  code: string;
  description: string | null;
  discount_pct: number;
  discount_amount: number | null;
  min_order_total: number | null;
  min_user_level: string;
  per_user_limit: number;
  max_uses: number | null;
  ends_at: string | null;
  is_active: boolean;
};

export type FlashSaleRow = {
  id: string;
  ends_at: string;
  starts_at: string | null;
  is_active: boolean;
  cycle_label: string | null;
};

export type FlashSaleProductRow = {
  id: string;
  flash_sale_id: string;
  product_id: string;
  product_name: string | null;
  category: string | null;
  original_price: number;
  discount_pct: number;
  reason: string | null;
  rank: number;
};

export type FlashSaleProductInput = {
  flash_sale_id: string;
  product_id: string;
  product_name: string | null;
  category: string | null;
  original_price: number;
  discount_pct: number;
  reason: string | null;
  rank: number;
};

export type FlashSaleState = {
  sale: FlashSaleRow | null;
  products: FlashSaleProductRow[];
};

// ---- Loose helper types ---------------------------------------------------
type SbResult<T> = { data: T | null; error: { message: string } | null };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SbAny = any;

// ---- Banners --------------------------------------------------------------
export const listBannersFn = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async ({ context }): Promise<BannerRow[]> => {
    const sb = context.supabase as SbAny;
    const { data, error } = (await sb
      .from("banners")
      .select("id, title, subtitle, image_url, placement, link_url, category_slug, sort_order, is_active")
      .order("sort_order", { ascending: true })) as SbResult<BannerRow[]>;
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const upsertBannerFn = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string | null; values: BannerInput }) => {
    if (!d.values?.title?.trim()) throw new Error("invalid_title");
    if (!d.values?.image_url?.trim()) throw new Error("invalid_image_url");
    return d;
  })
  .middleware([requireAdmin])
  .handler(async ({ data, context }) => {
    const sb = context.supabase as SbAny;
    const v = data.values;
    const payload = {
      title: v.title,
      subtitle: v.subtitle,
      image_url: v.image_url,
      placement: v.placement,
      link_url: v.link_url || null,
      category_slug: v.category_slug || null,
      sort_order: Number(v.sort_order) || 0,
      is_active: !!v.is_active,
    };
    const res = data.id
      ? await sb.from("banners").update(payload).eq("id", data.id)
      : await sb.from("banners").insert(payload);
    if (res.error) throw new Error(res.error.message);
    return { ok: true as const };
  });

export const setBannerActiveFn = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; is_active: boolean }) => d)
  .middleware([requireAdmin])
  .handler(async ({ data, context }) => {
    const sb = context.supabase as SbAny;
    const { error } = await sb.from("banners").update({ is_active: data.is_active }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const deleteBannerFn = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => d)
  .middleware([requireAdmin])
  .handler(async ({ data, context }) => {
    const sb = context.supabase as SbAny;
    const { error } = await sb.from("banners").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

// ---- Coupons --------------------------------------------------------------
export const listCouponsFn = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async ({ context }): Promise<CouponRow[]> => {
    const sb = context.supabase as SbAny;
    const { data, error } = (await sb
      .from("coupons")
      .select("id, code, description, discount_pct, discount_amount, min_order_total, min_user_level, per_user_limit, max_uses, uses_count, ends_at, is_active")
      .order("created_at", { ascending: false })) as SbResult<CouponRow[]>;
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const upsertCouponFn = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string | null; values: CouponInput }) => {
    if (!d.values?.code?.trim()) throw new Error("invalid_code");
    return d;
  })
  .middleware([requireAdmin])
  .handler(async ({ data, context }) => {
    const sb = context.supabase as SbAny;
    const v = data.values;
    const payload = {
      code: v.code.toUpperCase(),
      description: v.description || null,
      discount_pct: Number(v.discount_pct) || 0,
      discount_amount: v.discount_amount == null ? null : Number(v.discount_amount),
      min_order_total: v.min_order_total == null ? null : Number(v.min_order_total),
      min_user_level: v.min_user_level,
      per_user_limit: Number(v.per_user_limit) || 1,
      max_uses: v.max_uses == null ? null : Number(v.max_uses),
      ends_at: v.ends_at,
      is_active: !!v.is_active,
    };
    const res = data.id
      ? await sb.from("coupons").update(payload).eq("id", data.id)
      : await sb.from("coupons").insert(payload);
    if (res.error) throw new Error(res.error.message);
    return { ok: true as const };
  });

export const setCouponActiveFn = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; is_active: boolean }) => d)
  .middleware([requireAdmin])
  .handler(async ({ data, context }) => {
    const sb = context.supabase as SbAny;
    const { error } = await sb.from("coupons").update({ is_active: data.is_active }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const deleteCouponFn = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => d)
  .middleware([requireAdmin])
  .handler(async ({ data, context }) => {
    const sb = context.supabase as SbAny;
    const { error } = await sb.from("coupons").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

// ---- Flash Sales ----------------------------------------------------------
export const getActiveFlashSaleFn = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async ({ context }): Promise<FlashSaleState> => {
    const sb = context.supabase as SbAny;
    const { data: sales, error: e1 } = (await sb
      .from("flash_sales")
      .select("id, ends_at, starts_at, is_active, cycle_label")
      .eq("is_active", true)
      .order("starts_at", { ascending: false })
      .limit(1)) as SbResult<FlashSaleRow[]>;
    if (e1) throw new Error(e1.message);
    const sale = (sales ?? [])[0] ?? null;
    if (!sale) return { sale: null, products: [] };
    const { data: products, error: e2 } = (await sb
      .from("flash_sale_products")
      .select("id, flash_sale_id, product_id, product_name, category, original_price, discount_pct, reason, rank")
      .eq("flash_sale_id", sale.id)
      .order("rank", { ascending: true })) as SbResult<FlashSaleProductRow[]>;
    if (e2) throw new Error(e2.message);
    return { sale, products: products ?? [] };
  });

export const ensureActiveFlashSaleFn = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .handler(async ({ context }): Promise<FlashSaleRow> => {
    const sb = context.supabase as SbAny;
    const { data: existing } = (await sb
      .from("flash_sales")
      .select("id, ends_at, starts_at, is_active, cycle_label")
      .eq("is_active", true)
      .order("starts_at", { ascending: false })
      .limit(1)) as SbResult<FlashSaleRow[]>;
    const found = (existing ?? [])[0];
    if (found) return found;
    const ends = new Date();
    ends.setHours(ends.getHours() + 24);
    const { data, error } = (await sb
      .from("flash_sales")
      .insert({ ends_at: ends.toISOString(), is_active: true, cycle_label: "Flash 24h" })
      .select()
      .single()) as SbResult<FlashSaleRow>;
    if (error || !data) throw new Error(error?.message ?? "create_failed");
    return data;
  });

export const upsertFlashSaleFn = createServerFn({ method: "POST" })
  .inputValidator((d: { values: FlashSaleProductInput }) => {
    const v = d.values;
    if (!v?.product_id) throw new Error("invalid_product");
    if (!(v.original_price >= 0)) throw new Error("invalid_price");
    return d;
  })
  .middleware([requireAdmin])
  .handler(async ({ data, context }) => {
    const sb = context.supabase as SbAny;
    const v = data.values;
    const payload = {
      flash_sale_id: v.flash_sale_id,
      product_id: v.product_id,
      product_name: v.product_name || null,
      category: v.category || null,
      original_price: Number(v.original_price),
      discount_pct: Number(v.discount_pct) || 0,
      reason: v.reason || null,
      rank: Number(v.rank) || 0,
    };
    const { error } = await sb.from("flash_sale_products").insert(payload);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const deleteFlashSaleFn = createServerFn({ method: "POST" })
  .inputValidator((d: { productId: string }) => d)
  .middleware([requireAdmin])
  .handler(async ({ data, context }) => {
    const sb = context.supabase as SbAny;
    const { error } = await sb.from("flash_sale_products").delete().eq("id", data.productId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const endFlashSaleFn = createServerFn({ method: "POST" })
  .inputValidator((d: { saleId: string }) => d)
  .middleware([requireAdmin])
  .handler(async ({ data, context }) => {
    const sb = context.supabase as SbAny;
    const { error } = await sb
      .from("flash_sales")
      .update({ is_active: false, ends_at: new Date().toISOString() })
      .eq("id", data.saleId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

// ---- Aliases (per blueprint naming) --------------------------------------
export const listFlashSalesFn = getActiveFlashSaleFn;

// ============= Wave R-1 Batch 2 — Banner Storage Upload =============
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const uploadBannerImageFn = createServerFn({ method: "POST" })
  .inputValidator((d: { filename: string; contentType: string; base64: string }) => {
    if (!d?.filename) throw new Error("filename_required");
    if (!d?.base64) throw new Error("base64_required");
    if (!d?.contentType) throw new Error("contentType_required");
    if (!/^image\//.test(d.contentType)) throw new Error("invalid_content_type");
    // ~6MB cap on raw bytes
    const approxBytes = Math.floor((d.base64.length * 3) / 4);
    if (approxBytes > 6 * 1024 * 1024) throw new Error("file_too_large");
    return d;
  })
  .middleware([requireAdmin])
  .handler(async ({ data }): Promise<{ publicUrl: string }> => {
    const ext = (data.filename.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const buffer = Buffer.from(data.base64, "base64");
    const { error } = await supabaseAdmin.storage
      .from("marketing-banners")
      .upload(path, buffer, {
        cacheControl: "3600",
        upsert: false,
        contentType: data.contentType,
      });
    if (error) throw new Error(error.message);
    const { data: pub } = supabaseAdmin.storage.from("marketing-banners").getPublicUrl(path);
    return { publicUrl: pub.publicUrl };
  });
