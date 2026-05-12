/**
 * Server Functions — Catalog reads.
 *
 * كل القراءة تتم هنا عبر supabase server-side client (RLS-aware) ثم تُحوّل
 * إلى VMs قبل إرجاعها للعميل. لا يخرج أي شكل من DB raw للواجهات.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabase as supabaseBrowser } from "@/integrations/supabase/client";
import {
  buildCardsBatch,
  buildDetails,
} from "../runtime/ProductRuntimeEngine";
import { normalizeRelation } from "../runtime/ProductTransformers";
import type {
  ProductCardVM,
  ProductDetailsVM,
  ProductListVM,
  ProductRelationVM,
} from "../types";
import {
  projectProductDNA,
  type UsaProductRow,
} from "@/core/dna/projectors/projectProductDNA";
import type { ProductCivilizationEntity } from "@/core/dna/types";

/**
 * ملاحظة: نستخدم supabase publishable client (anon) لأن قراءة المنتجات عامة
 * (RLS policy: usa_products_read_active يسمح للجميع). لا حاجة لـ service role.
 * في server runtime، client.ts ينشئ instance مناسبة (SSR-safe).
 */
const supabase = supabaseBrowser;

const ListSchema = z.object({
  sectionSlug: z.string().min(1).max(64),
  limit: z.number().int().min(1).max(100).default(24),
  offset: z.number().int().min(0).default(0),
  sort: z.enum(["popularity", "new", "price_asc", "price_desc", "seasonal"]).default("popularity"),
});

export const listProductsBySectionFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => ListSchema.parse(input))
  .handler(async ({ data }): Promise<ProductListVM> => {
    // 1) section + capabilities
    const { data: section, error: sErr } = await supabase
      .from("sections")
      .select("id, slug")
      .eq("slug", data.sectionSlug)
      .maybeSingle();
    if (sErr) throw sErr;
    if (!section) return { items: [], total: 0, hasMore: false };

    const { data: caps } = await supabase
      .from("section_capabilities")
      .select("capability_key")
      .eq("section_id", section.id);
    const capabilityKeys = (caps ?? []).map((c) => c.capability_key);

    // 2) products
    let query = supabase
      .from("usa_products")
      .select("*", { count: "exact" })
      .eq("section_id", section.id)
      .eq("is_active", true)
      .is("deleted_at", null);

    switch (data.sort) {
      case "new":
        query = query.order("created_at", { ascending: false });
        break;
      case "price_asc":
        query = query.order("base_price", { ascending: true });
        break;
      case "price_desc":
        query = query.order("base_price", { ascending: false });
        break;
      case "seasonal":
        query = query.order("is_featured", { ascending: false }).order("popularity_score", { ascending: false });
        break;
      default:
        query = query.order("popularity_score", { ascending: false });
    }

    query = query.range(data.offset, data.offset + data.limit - 1);

    const { data: rows, count, error: pErr } = await query;
    if (pErr) throw pErr;

    const productIds = (rows ?? []).map((r) => r.id);
    let heroMedia = new Map();
    if (productIds.length) {
      const { data: media } = await supabase
        .from("product_media")
        .select("*")
        .in("product_id", productIds)
        .eq("kind", "hero");
      heroMedia = new Map((media ?? []).map((m) => [m.product_id, m]));
    }

    const sectionInfo = new Map([[section.id, { slug: section.slug, capabilities: capabilityKeys }]]);
    const items = buildCardsBatch({ products: rows ?? [], sectionInfo, heroMedia });

    const total = count ?? items.length;
    const nextOffset = data.offset + items.length;
    return {
      items,
      total,
      hasMore: nextOffset < total,
      nextOffset: nextOffset < total ? nextOffset : undefined,
    };
  });

const DetailsSchema = z.object({ slug: z.string().min(1).max(128) });

export const getProductDetailsFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => DetailsSchema.parse(input))
  .handler(async ({ data }): Promise<ProductDetailsVM | null> => {
    const { data: row, error } = await supabase
      .from("usa_products")
      .select("*")
      .eq("slug", data.slug)
      .eq("is_active", true)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw error;
    if (!row) return null;

    const [{ data: section }, { data: media }, { data: variants }, { data: addons }, { data: nutrition }, { data: relations }] = await Promise.all([
      supabase.from("sections").select("id, slug").eq("id", row.section_id).maybeSingle(),
      supabase.from("product_media").select("*").eq("product_id", row.id).order("sort_order"),
      supabase.from("product_variants_v2").select("*").eq("product_id", row.id).eq("is_active", true).order("sort_order"),
      supabase.from("product_addons").select("*").eq("product_id", row.id).eq("is_active", true).order("sort_order"),
      supabase.from("product_nutrition").select("*").eq("product_id", row.id).maybeSingle(),
      supabase.from("product_relations").select("*").eq("product_id", row.id),
    ]);
    if (!section) return null;

    const { data: caps } = await supabase
      .from("section_capabilities")
      .select("capability_key")
      .eq("section_id", section.id);
    const capabilityKeys = (caps ?? []).map((c) => c.capability_key);

    return buildDetails({
      product: row,
      section: { slug: section.slug, capabilities: capabilityKeys },
      media: media ?? [],
      variants: variants ?? [],
      addons: addons ?? [],
      nutrition: nutrition ?? null,
      relations: relations ?? [],
    });
  });

const RelationsSchema = z.object({ productId: z.string().uuid() });

export const getProductRelationsFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => RelationsSchema.parse(input))
  .handler(async ({ data }): Promise<ProductRelationVM[]> => {
    const { data: rows, error } = await supabase
      .from("product_relations")
      .select("*")
      .eq("product_id", data.productId);
    if (error) throw error;
    return (rows ?? []).map(normalizeRelation);
  });

// ─────────────────────────────────────────────────────────────────────────────
// Wave P-B (Static Catalog Killer) — Cart hydration & integrity surface.
// These three handlers are the canonical replacement for `getById` / `bySource`
// / direct `products` reads previously served by `src/lib/products.ts`. They
// underpin `catalogGateway.getManyById`, `catalogGateway.getDetailsById`, and
// `catalogGateway.priceQuote`.
// ─────────────────────────────────────────────────────────────────────────────

const ManyByIdSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
});

export const getProductsByIdsFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => ManyByIdSchema.parse(input))
  .handler(async ({ data }): Promise<ProductCardVM[]> => {
    const { data: rows, error } = await supabase
      .from("usa_products")
      .select("*")
      .in("id", data.ids)
      .eq("is_active", true)
      .is("deleted_at", null);
    if (error) throw error;
    if (!rows || rows.length === 0) return [];

    const sectionIds = Array.from(new Set(rows.map((r) => r.section_id)));
    const [{ data: sections }, { data: caps }, { data: media }] = await Promise.all([
      supabase.from("sections").select("id, slug").in("id", sectionIds),
      supabase
        .from("section_capabilities")
        .select("section_id, capability_key")
        .in("section_id", sectionIds),
      supabase
        .from("product_media")
        .select("*")
        .in("product_id", rows.map((r) => r.id))
        .eq("kind", "hero"),
    ]);

    const capsBySection = new Map<string, string[]>();
    for (const c of caps ?? []) {
      const arr = capsBySection.get(c.section_id) ?? [];
      arr.push(c.capability_key);
      capsBySection.set(c.section_id, arr);
    }
    const sectionInfo = new Map(
      (sections ?? []).map((s) => [
        s.id,
        { slug: s.slug, capabilities: capsBySection.get(s.id) ?? [] },
      ]),
    );
    const heroMedia = new Map((media ?? []).map((m) => [m.product_id, m]));

    return buildCardsBatch({ products: rows, sectionInfo, heroMedia });
  });

const DetailsByIdSchema = z.object({ id: z.string().uuid() });

export const getProductDetailsByIdFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => DetailsByIdSchema.parse(input))
  .handler(async ({ data }): Promise<ProductDetailsVM | null> => {
    const { data: row, error } = await supabase
      .from("usa_products")
      .select("*")
      .eq("id", data.id)
      .eq("is_active", true)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw error;
    if (!row) return null;

    const [
      { data: section },
      { data: media },
      { data: variants },
      { data: addons },
      { data: nutrition },
      { data: relations },
    ] = await Promise.all([
      supabase.from("sections").select("id, slug").eq("id", row.section_id).maybeSingle(),
      supabase.from("product_media").select("*").eq("product_id", row.id).order("sort_order"),
      supabase
        .from("product_variants_v2")
        .select("*")
        .eq("product_id", row.id)
        .eq("is_active", true)
        .order("sort_order"),
      supabase
        .from("product_addons")
        .select("*")
        .eq("product_id", row.id)
        .eq("is_active", true)
        .order("sort_order"),
      supabase.from("product_nutrition").select("*").eq("product_id", row.id).maybeSingle(),
      supabase.from("product_relations").select("*").eq("product_id", row.id),
    ]);
    if (!section) return null;

    const { data: caps } = await supabase
      .from("section_capabilities")
      .select("capability_key")
      .eq("section_id", section.id);
    const capabilityKeys = (caps ?? []).map((c) => c.capability_key);

    return buildDetails({
      product: row,
      section: { slug: section.slug, capabilities: capabilityKeys },
      media: media ?? [],
      variants: variants ?? [],
      addons: addons ?? [],
      nutrition: nutrition ?? null,
      relations: relations ?? [],
    });
  });

const PriceQuoteSchema = z.object({
  lines: z
    .array(
      z.object({
        productId: z.string().uuid(),
        variantId: z.string().uuid().optional(),
        qty: z.number().int().min(1).max(999),
      }),
    )
    .min(1)
    .max(100),
});

export interface PriceQuoteLineVM {
  productId: string;
  variantId?: string;
  unitPrice: number;
  lineTotal: number;
  currency: string;
  /** True if the upstream price differs from any client-captured value. Resolved client-side. */
  available: boolean;
}

export interface PriceQuoteVM {
  lines: PriceQuoteLineVM[];
  currency: string;
  quotedAt: string;
}

export const priceQuoteFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => PriceQuoteSchema.parse(input))
  .handler(async ({ data }): Promise<PriceQuoteVM> => {
    const productIds = Array.from(new Set(data.lines.map((l) => l.productId)));
    const { data: rows, error } = await supabase
      .from("usa_products")
      .select("id, base_price, currency, is_active, deleted_at")
      .in("id", productIds);
    if (error) throw error;

    const variantIds = data.lines
      .map((l) => l.variantId)
      .filter((v): v is string => typeof v === "string");
    const variantDeltas = new Map<string, number>();
    if (variantIds.length > 0) {
      const { data: vrows } = await supabase
        .from("product_variants_v2")
        .select("id, price_delta")
        .in("id", variantIds);
      for (const v of vrows ?? []) {
        variantDeltas.set(v.id, Number(v.price_delta ?? 0));
      }
    }

    const byId = new Map((rows ?? []).map((r) => [r.id, r]));
    const currency = (rows?.[0]?.currency as string | undefined) ?? "EGP";
    const quotedLines: PriceQuoteLineVM[] = data.lines.map((l) => {
      const row = byId.get(l.productId);
      const available = !!row && row.is_active === true && row.deleted_at === null;
      const base = Number(row?.base_price ?? 0);
      const delta = l.variantId ? (variantDeltas.get(l.variantId) ?? 0) : 0;
      const unitPrice = base + delta;
      return {
        productId: l.productId,
        variantId: l.variantId,
        unitPrice,
        lineTotal: unitPrice * l.qty,
        currency: (row?.currency as string | undefined) ?? currency,
        available,
      };
    });
    return { lines: quotedLines, currency, quotedAt: new Date().toISOString() };
  });

