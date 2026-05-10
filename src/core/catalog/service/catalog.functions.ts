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
  ProductDetailsVM,
  ProductListVM,
  ProductRelationVM,
} from "../types";

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
      .eq("section_id", section.id)
      .eq("is_enabled", true);
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
      .eq("section_id", section.id)
      .eq("is_enabled", true);
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
