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
  PriceVM,
  MediaRefVM,
  I18nText,
  JsonValue,
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

/* ────────────────────────────────────────────────────────────────────
 * Phase N-1 — Sovereign Asset Adapter.
 * Storefront grids and PDP now read from `salsabil_assets` joined with
 * `salsabil_skus` and `salsabil_financial_contracts`. Section scoping
 * is done via `category_path` prefix matching since assets carry no
 * `section_id` column. The legacy `usa_products` table is preserved
 * for forensic rollback but is no longer queried by the storefront.
 * ──────────────────────────────────────────────────────────────────── */

type SovereignAsset = {
  id: string;
  name: string;
  description: string | null;
  category_path: string | null;
  traits: Record<string, unknown> | null;
  media: unknown;
  is_active: boolean;
  asset_type: string;
  created_at: string;
  salsabil_skus: Array<{
    id: string;
    sku_code: string;
    barcode: string | null;
    attributes: Record<string, unknown> | null;
    is_active: boolean | null;
    sort_order: number | null;
    salsabil_financial_contracts: Array<{
      base_price: number | string | null;
      currency: string | null;
      contract_rules: Record<string, unknown> | null;
      is_active: boolean | null;
    }> | null;
  }> | null;
};

const SOVEREIGN_SELECT = `
  id, name, description, category_path, traits, media, is_active, asset_type, created_at,
  salsabil_skus (
    id, sku_code, barcode, attributes, is_active, sort_order,
    salsabil_financial_contracts ( base_price, currency, contract_rules, is_active )
  )
` as const;

const FALLBACK_IMG =
  "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23f3f4f6'/%3E%3C/svg%3E";

function pickHero(media: unknown): MediaRefVM | undefined {
  let url: string | null = null;
  if (Array.isArray(media) && media.length > 0) {
    const first = media[0];
    if (typeof first === "string") url = first;
    else if (first && typeof first === "object") {
      const r = first as Record<string, unknown>;
      url = (r.url ?? r.src ?? r.path) as string | undefined ?? null;
    }
  } else if (media && typeof media === "object") {
    const r = media as Record<string, unknown>;
    url = (r.url ?? r.src) as string | undefined ?? null;
  }
  if (!url) return undefined;
  return { url, alt: { ar: "" }, kind: "hero" };
}

type SovereignSku = NonNullable<SovereignAsset["salsabil_skus"]>[number];

function pickPrimarySku(asset: SovereignAsset): SovereignSku | undefined {
  const skus = asset.salsabil_skus ?? [];
  const ordered = [...skus].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  return ordered.find((s) => s.is_active !== false) ?? ordered[0];
}

function assetToCardVM(
  asset: SovereignAsset,
  section: { id: string; slug: string },
): ProductCardVM | null {
  const primary = pickPrimarySku(asset);
  if (!primary) return null;
  const contract = primary.salsabil_financial_contracts?.find((c) => c.is_active !== false)
    ?? primary.salsabil_financial_contracts?.[0];
  const baseAmount = contract?.base_price != null ? Number(contract.base_price) : 0;
  const traits = (asset.traits ?? {}) as Record<string, unknown>;
  const compareAtRaw = traits.old_price ?? traits.compare_at_price;
  const compareAt = typeof compareAtRaw === "number" ? compareAtRaw : Number(compareAtRaw ?? NaN);
  const currency = ((contract?.currency ?? "EGP") as PriceVM["currency"]);
  const price: PriceVM = {
    amount: baseAmount,
    currency,
    compareAt: Number.isFinite(compareAt) && compareAt > baseAmount ? compareAt : undefined,
    discountRatio: Number.isFinite(compareAt) && compareAt > baseAmount && baseAmount > 0
      ? Math.max(0, Math.min(1, 1 - baseAmount / compareAt))
      : undefined,
    tier: "base",
  };
  const name: I18nText = { ar: asset.name };
  const tagsRaw = traits.tags;
  const tags: string[] = Array.isArray(tagsRaw)
    ? tagsRaw.filter((t): t is string => typeof t === "string")
    : [];
  const hero = pickHero(asset.media) ?? { url: FALLBACK_IMG, alt: name, kind: "hero" };
  const attrs: Record<string, JsonValue> = {
    asset_id: asset.id,
    sku_id: primary.id,
    category_path: asset.category_path ?? null,
    ...(traits as Record<string, JsonValue>),
  };
  return {
    id: asset.id,
    slug: asset.id, // Sovereign assets are addressed by UUID until slug column lands.
    sku: primary.sku_code,
    sectionId: section.id,
    sectionSlug: section.slug,
    name,
    shortDescription: typeof traits.short_description === "string"
      ? { ar: traits.short_description as string }
      : undefined,
    hero,
    price,
    saleUnit: ((primary.attributes as Record<string, unknown> | null)?.unit
      ?? traits.unit ?? "وحدة") as string,
    inStock: true, // inventory join can refine later
    isLowStock: false,
    badges: [],
    tags,
    rating: { avg: typeof traits.rating === "number" ? (traits.rating as number) : 0, count: 0 },
    capabilities: [],
    attributes: Object.freeze(attrs),
  };
}

export const listProductsBySectionFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => ListSchema.parse(input))
  .handler(async ({ data }): Promise<ProductListVM> => {
    // 1) section row (we still need the id for ProductCardVM.sectionId).
    const { data: section, error: sErr } = await supabase
      .from("sections")
      .select("id, slug")
      .eq("slug", data.sectionSlug)
      .maybeSingle();
    if (sErr) throw sErr;
    if (!section) return { items: [], total: 0, hasMore: false };

    // 2) Sovereign assets scoped by category_path prefix.
    const slugLike = `${data.sectionSlug}%`;
    let query = supabase
      .from("salsabil_assets")
      .select(SOVEREIGN_SELECT, { count: "exact" })
      .eq("is_active", true)
      .eq("asset_type", "physical")
      .ilike("category_path", slugLike);

    switch (data.sort) {
      case "new":
        query = query.order("created_at", { ascending: false });
        break;
      case "price_asc":
      case "price_desc":
      case "seasonal":
      case "popularity":
      default:
        query = query.order("created_at", { ascending: false });
    }
    query = query.range(data.offset, data.offset + data.limit - 1);

    const { data: rows, count, error: pErr } = await query;
    if (pErr) throw pErr;

    let items = ((rows ?? []) as unknown as SovereignAsset[])
      .map((a) => assetToCardVM(a, section))
      .filter((v): v is ProductCardVM => v != null);

    if (data.sort === "price_asc") items = items.sort((a, b) => a.price.amount - b.price.amount);
    if (data.sort === "price_desc") items = items.sort((a, b) => b.price.amount - a.price.amount);

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
    // Phase N-1: assets are addressed by UUID through the slug field.
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.slug);
    if (!isUuid) return null;
    const { data: asset, error } = await supabase
      .from("salsabil_assets")
      .select(SOVEREIGN_SELECT)
      .eq("id", data.slug)
      .eq("is_active", true)
      .maybeSingle();
    if (error) throw error;
    if (!asset) return null;

    const a = asset as unknown as SovereignAsset;
    const slugHead = a.category_path?.split("/")[0] ?? "";
    const { data: section } = slugHead
      ? await supabase.from("sections").select("id, slug").eq("slug", slugHead).maybeSingle()
      : { data: null as { id: string; slug: string } | null };
    const fallbackSection = section ?? { id: "00000000-0000-0000-0000-000000000000", slug: slugHead || "general" };
    const card = assetToCardVM(a, fallbackSection);
    if (!card) return null;

    const traits = (a.traits ?? {}) as Record<string, unknown>;
    const galleryRaw = Array.isArray(a.media) ? a.media : [];
    const gallery: MediaRefVM[] = galleryRaw
      .map((m): MediaRefVM | null => {
        if (typeof m === "string") return { url: m, alt: card.name, kind: "gallery" };
        if (m && typeof m === "object") {
          const r = m as Record<string, unknown>;
          const url = (r.url ?? r.src) as string | undefined;
          if (!url) return null;
          return { url, alt: card.name, kind: (r.kind as string) ?? "gallery" };
        }
        return null;
      })
      .filter((x): x is MediaRefVM => x != null)
      .filter((m) => m.url !== card.hero?.url);

    return {
      ...card,
      description: a.description ? { ar: a.description } : undefined,
      isPerishable: traits.perishable === true,
      gallery,
      variants: [],
      addons: [],
      relations: [],
    };
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


// ────────────────────────────────────────────────────────────────────────────
// Constitution v2.0 · Phase 1 · Step 3
// DNA Endpoint — exposes a `usa_products` row as a ProductCivilizationEntity.
// Public read (matches the existing public RLS on usa_products). Returns the
// clean Layer-4 Domain model — never raw DB rows.
// ────────────────────────────────────────────────────────────────────────────

const DNAInputSchema = z.object({
  id: z.string().uuid(),
});

export const getProductDNAFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => DNAInputSchema.parse(input))
  .handler(async ({ data }): Promise<ProductCivilizationEntity> => {
    const { data: row, error } = await supabase
      .from("usa_products")
      .select("*")
      .eq("id", data.id)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) throw error;
    if (!row) throw new Error(`Product DNA not found for id=${data.id}`);

    return projectProductDNA(row as UsaProductRow);
  });
