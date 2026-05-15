/**
 * Server Functions — Catalog reads.
 *
 * كل القراءة تتم هنا عبر supabase server-side client (RLS-aware) ثم تُحوّل
 * إلى VMs قبل إرجاعها للعميل. لا يخرج أي شكل من DB raw للواجهات.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabase as supabaseBrowser } from "@/integrations/supabase/client";
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
} from "@/core/commerce/knowledge/projectors/projectProductDNA";
import type { ProductCivilizationEntity } from "@/core/commerce/knowledge/dna.types";

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
    // WAVE R-1: `home-goods` is the canonical home aggregator — returns ALL
    // active physical assets regardless of category_path so the storefront
    // never goes Ghost when assets are uncategorised. Other slugs do prefix
    // match (and tolerate NULL category_path so freshly-genesised assets
    // surface until categorisation lands).
    const isHomeAggregator = data.sectionSlug === "home-goods";
    let query = supabase
      .from("salsabil_assets")
      .select(SOVEREIGN_SELECT, { count: "exact" })
      .eq("is_active", true)
      .eq("asset_type", "physical");
    if (!isHomeAggregator) {
      const slugLike = `${data.sectionSlug}%`;
      query = query.or(`category_path.ilike.${slugLike},category_path.is.null`);
    }

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
// Phase U-1 (Unification Strike) — Cart hydration & integrity surface.
// These four handlers were previously bound to the legacy `usa_products`
// table. They now read directly from the Sovereign Asset Ledger
// (`salsabil_assets` ⨝ `salsabil_skus` ⨝ `salsabil_financial_contracts`)
// and reuse the in-file `assetToCardVM` adapter so every consumer of
// `catalogGateway` keeps receiving canonical `ProductCardVM`/`ProductDetailsVM`.
// ─────────────────────────────────────────────────────────────────────────────

const ManyByIdSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
});

async function resolveSectionForCategoryPath(
  path: string | null,
): Promise<{ id: string; slug: string }> {
  const head = path?.split("/")[0] ?? "";
  if (!head) return { id: "00000000-0000-0000-0000-000000000000", slug: "general" };
  const { data } = await supabase
    .from("sections")
    .select("id, slug")
    .eq("slug", head)
    .maybeSingle();
  return data ?? { id: "00000000-0000-0000-0000-000000000000", slug: head };
}

export const getProductsByIdsFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => ManyByIdSchema.parse(input))
  .handler(async ({ data }): Promise<ProductCardVM[]> => {
    const { data: rows, error } = await supabase
      .from("salsabil_assets")
      .select(SOVEREIGN_SELECT)
      .in("id", data.ids)
      .eq("is_active", true);
    if (error) throw error;
    if (!rows || rows.length === 0) return [];

    const assets = rows as unknown as SovereignAsset[];
    const slugHeads = Array.from(
      new Set(assets.map((a) => a.category_path?.split("/")[0] ?? "").filter(Boolean)),
    );
    const sectionMap = new Map<string, { id: string; slug: string }>();
    if (slugHeads.length > 0) {
      const { data: secs } = await supabase
        .from("sections")
        .select("id, slug")
        .in("slug", slugHeads);
      for (const s of secs ?? []) sectionMap.set(s.slug, { id: s.id, slug: s.slug });
    }

    const out: ProductCardVM[] = [];
    for (const a of assets) {
      const head = a.category_path?.split("/")[0] ?? "";
      const section = sectionMap.get(head)
        ?? { id: "00000000-0000-0000-0000-000000000000", slug: head || "general" };
      const card = assetToCardVM(a, section);
      if (card) out.push(card);
    }
    return out;
  });

const DetailsByIdSchema = z.object({ id: z.string().uuid() });

export const getProductDetailsByIdFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => DetailsByIdSchema.parse(input))
  .handler(async ({ data }): Promise<ProductDetailsVM | null> => {
    const { data: row, error } = await supabase
      .from("salsabil_assets")
      .select(SOVEREIGN_SELECT)
      .eq("id", data.id)
      .eq("is_active", true)
      .maybeSingle();
    if (error) throw error;
    if (!row) return null;

    const asset = row as unknown as SovereignAsset;
    const section = await resolveSectionForCategoryPath(asset.category_path);
    const card = assetToCardVM(asset, section);
    if (!card) return null;

    const traits = (asset.traits ?? {}) as Record<string, unknown>;
    const galleryRaw = Array.isArray(asset.media) ? asset.media : [];
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
      description: asset.description ? { ar: asset.description } : undefined,
      isPerishable: traits.perishable === true,
      gallery,
      variants: [],
      addons: [],
      relations: [],
    };
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
      .from("salsabil_assets")
      .select(`id, is_active, salsabil_skus ( id, sort_order, is_active, salsabil_financial_contracts ( base_price, currency, is_active ) )`)
      .in("id", productIds);
    if (error) throw error;

    type AssetPriceRow = {
      id: string;
      is_active: boolean;
      salsabil_skus: Array<{
        id: string;
        sort_order: number | null;
        is_active: boolean | null;
        salsabil_financial_contracts: Array<{
          base_price: number | string | null;
          currency: string | null;
          is_active: boolean | null;
        }> | null;
      }> | null;
    };
    const assetById = new Map(
      ((rows ?? []) as unknown as AssetPriceRow[]).map((r) => [r.id, r]),
    );

    let currency = "EGP";
    const quotedLines: PriceQuoteLineVM[] = data.lines.map((l) => {
      const asset = assetById.get(l.productId);
      const skus = asset?.salsabil_skus ?? [];
      const ordered = [...skus].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
      const sku = l.variantId
        ? ordered.find((s) => s.id === l.variantId)
        : (ordered.find((s) => s.is_active !== false) ?? ordered[0]);
      const contract =
        sku?.salsabil_financial_contracts?.find((c) => c.is_active !== false)
        ?? sku?.salsabil_financial_contracts?.[0];
      const unitPrice = contract?.base_price != null ? Number(contract.base_price) : 0;
      const lineCurrency = (contract?.currency ?? "EGP") as string;
      currency = lineCurrency;
      const available = !!asset && asset.is_active === true && !!sku;
      return {
        productId: l.productId,
        variantId: l.variantId,
        unitPrice,
        lineTotal: unitPrice * l.qty,
        currency: lineCurrency,
        available,
      };
    });
    return { lines: quotedLines, currency, quotedAt: new Date().toISOString() };
  });


// ────────────────────────────────────────────────────────────────────────────
// Constitution v2.0 · Phase 1 · Step 3
// DNA Endpoint — exposes a Sovereign Asset row as a ProductCivilizationEntity.
// Public read (matches `salsabil_assets` public RLS). Returns the clean Layer-4
// Domain model — never raw DB rows. The tolerant `projectProductDNA` projector
// accepts our synthesized partial-row shape and fills any gaps with defaults.
// ────────────────────────────────────────────────────────────────────────────

const DNAInputSchema = z.object({
  id: z.string().uuid(),
});

export const getProductDNAFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => DNAInputSchema.parse(input))
  .handler(async ({ data }): Promise<ProductCivilizationEntity> => {
    const { data: row, error } = await supabase
      .from("salsabil_assets")
      .select(SOVEREIGN_SELECT)
      .eq("id", data.id)
      .eq("is_active", true)
      .maybeSingle();

    if (error) throw error;
    if (!row) throw new Error(`Product DNA not found for id=${data.id}`);

    const asset = row as unknown as SovereignAsset;
    const primary = pickPrimarySku(asset);
    const contract = primary?.salsabil_financial_contracts?.find((c) => c.is_active !== false)
      ?? primary?.salsabil_financial_contracts?.[0];
    const traits = (asset.traits ?? {}) as Record<string, unknown>;

    const synthesized: UsaProductRow = {
      id: asset.id,
      slug: (traits.slug as string | undefined) ?? asset.id,
      sku: primary?.sku_code ?? null,
      section_id: null,
      name_i18n: { ar: asset.name } as unknown as JsonValue,
      description_i18n: asset.description
        ? ({ ar: asset.description } as unknown as JsonValue)
        : null,
      base_price: contract?.base_price ?? 0,
      currency: contract?.currency ?? "EGP",
      sale_unit: ((primary?.attributes as Record<string, unknown> | null)?.unit
        ?? traits.unit ?? null) as string | null,
      is_perishable: traits.perishable === true,
      tags: Array.isArray(traits.tags)
        ? (traits.tags as unknown[]).filter((t): t is string => typeof t === "string")
        : null,
      attributes: traits as unknown as JsonValue,
    } as UsaProductRow;

    return projectProductDNA(synthesized);
  });
