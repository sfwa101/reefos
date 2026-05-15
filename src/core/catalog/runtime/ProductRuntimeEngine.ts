/**
 * Runtime Engine — orchestrator يستقبل صفوف Sovereign Asset خام ويرجع VMs
 * نهائية.
 *
 * WAVE R-1 (Constitution v5): the engine no longer references the
 * deprecated `usa_products` schema. Inputs are now `SalsabilAssetRow`
 * shapes; the engine adapts them to the internal `NormalizedProduct`
 * pipeline before running the VM factory + section adapters.
 *
 * هذه الطبقة لا تعرف من أين أتت البيانات (Postgres/cache/in-memory للاختبار).
 * مهمتها فقط: adapt → normalize → hydrate → adapt.
 */
import type { Database } from "@/integrations/supabase/types";
import type { ProductCardVM, ProductDetailsVM, MediaRefVM } from "../types";
import { sectionAdapters } from "../adapters/SectionAdapters";
import {
  buildProductCard,
  buildProductDetails,
  type BuildDetailsInput,
} from "./ProductViewModelFactory";
import type { HydrationContext } from "./ProductHydrationPipeline";
import {
  normalizeProduct,
  normalizeMedia,
  normalizeVariant,
  normalizeAddon,
  normalizeNutrition,
  normalizeRelation,
} from "./ProductTransformers";
import type { SalsabilAssetRow } from "@/core/commerce/knowledge/projectors/projectProductDNA";

type Row<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

/**
 * Adapter: project a Sovereign Asset row into the legacy `usa_products`
 * row shape so the existing `normalizeProduct` pipeline can stay intact.
 * Internal-only; never returned to the UI.
 */
function assetRowToProductRow(
  asset: SalsabilAssetRow,
  sectionId: string,
): Row<"usa_products"> {
  const traits = (asset.traits && typeof asset.traits === "object" && !Array.isArray(asset.traits))
    ? (asset.traits as Record<string, unknown>)
    : {};
  const sku = asset.primary_sku ?? null;
  const contract = asset.primary_contract ?? null;
  const skuAttrs = (sku?.attributes && typeof sku.attributes === "object" && !Array.isArray(sku.attributes))
    ? (sku.attributes as Record<string, unknown>)
    : {};
  const unit =
    typeof skuAttrs.unit === "string"
      ? (skuAttrs.unit as string)
      : typeof traits.unit === "string"
        ? (traits.unit as string)
        : "piece";
  const tags = Array.isArray(traits.tags)
    ? (traits.tags as unknown[]).filter((t): t is string => typeof t === "string")
    : [];
  const badges = Array.isArray(traits.badges)
    ? (traits.badges as unknown[]).filter((t): t is string => typeof t === "string")
    : [];

  return {
    id: asset.id,
    slug: typeof traits.slug === "string" ? (traits.slug as string) : asset.id,
    sku: sku?.sku_code ?? null,
    section_id: sectionId,
    name_i18n: { ar: asset.name ?? "" } as never,
    short_description_i18n:
      typeof traits.short_description === "string"
        ? ({ ar: traits.short_description as string } as never)
        : null,
    description_i18n: asset.description ? ({ ar: asset.description } as never) : null,
    story_i18n: null,
    storage_conditions_i18n: null,
    base_price: contract?.base_price != null ? Number(contract.base_price) : 0,
    compare_at_price: contract?.compare_at_price != null ? Number(contract.compare_at_price) : null,
    wholesale_price: contract?.wholesale_price != null ? Number(contract.wholesale_price) : null,
    member_price: contract?.member_price != null ? Number(contract.member_price) : null,
    tax_class: contract?.tax_class ?? null,
    currency: contract?.currency ?? "EGP",
    sale_unit: unit,
    stock_qty: 0,
    low_stock_threshold: 0,
    is_perishable: traits.perishable === true,
    shelf_life_days: null,
    seasonal_window: null,
    badges,
    tags,
    attributes: traits as never,
    popularity_score: typeof traits.popularity === "number" ? (traits.popularity as number) : 0,
    rating_avg: typeof traits.rating === "number" ? (traits.rating as number) : 0,
    rating_count: 0,
    is_active: asset.is_active ?? true,
    is_featured: traits.featured === true,
    created_at: asset.created_at ?? new Date().toISOString(),
    updated_at: asset.updated_at ?? new Date().toISOString(),
  } as Row<"usa_products">;
}

export interface BuildCardsBatchInput {
  /** Sovereign Asset rows (`salsabil_assets` ⨝ optional sku/contract). */
  products: readonly SalsabilAssetRow[];
  /** map: sectionId → { slug, capabilities[] } */
  sectionInfo: ReadonlyMap<string, { slug: string; capabilities: readonly string[] }>;
  /** map: assetId → resolved sectionId (since assets carry no section_id column). */
  assetSectionMap: ReadonlyMap<string, string>;
  /** map: assetId → hero media row (optional). */
  heroMedia?: ReadonlyMap<string, Row<"product_media">>;
  ctx?: HydrationContext;
}

export function buildCardsBatch(input: BuildCardsBatchInput): ProductCardVM[] {
  const out: ProductCardVM[] = [];
  for (const asset of input.products) {
    const sectionId = input.assetSectionMap.get(asset.id) ?? "";
    const info = input.sectionInfo.get(sectionId);
    if (!info) continue; // قسم غير معروف — يتجاهل بدلاً من الانهيار
    const productRow = assetRowToProductRow(asset, sectionId);
    const product = normalizeProduct(productRow);
    const heroRow = input.heroMedia?.get(asset.id);
    const hero: MediaRefVM | undefined = heroRow ? normalizeMedia(heroRow) : undefined;
    const card = buildProductCard({
      product,
      sectionSlug: info.slug,
      sectionCapabilities: info.capabilities,
      hero,
      ctx: input.ctx,
    });
    out.push(sectionAdapters.applyCard(info.slug, card));
  }
  return out;
}

export interface BuildDetailsBatchInput {
  product: SalsabilAssetRow;
  section: { id: string; slug: string; capabilities: readonly string[] };
  media: readonly Row<"product_media">[];
  variants: readonly Row<"product_variants_v2">[];
  addons: readonly Row<"product_addons">[];
  nutrition?: Row<"product_nutrition"> | null;
  relations: readonly Row<"product_relations">[];
  ctx?: HydrationContext;
}

export function buildDetails(input: BuildDetailsBatchInput): ProductDetailsVM {
  const productRow = assetRowToProductRow(input.product, input.section.id);
  const product = normalizeProduct(productRow);
  const allMedia = input.media.map(normalizeMedia).sort(byKindThenOrder(input.media));
  const hero = allMedia.find((m) => m.kind === "hero") ?? allMedia[0];
  const gallery = allMedia.filter((m) => m !== hero);

  const buildInput: BuildDetailsInput = {
    product,
    sectionSlug: input.section.slug,
    sectionCapabilities: input.section.capabilities,
    hero,
    gallery,
    variants: input.variants.map(normalizeVariant),
    addons: input.addons.map(normalizeAddon),
    nutrition: input.nutrition ? normalizeNutrition(input.nutrition) : undefined,
    relations: input.relations.map(normalizeRelation),
    ctx: input.ctx,
  };

  const details = buildProductDetails(buildInput);
  return sectionAdapters.applyDetails(input.section.slug, details);
}

const byKindThenOrder =
  (rows: readonly Row<"product_media">[]) =>
  (a: MediaRefVM, b: MediaRefVM): number => {
    const order = (m: MediaRefVM) => {
      const r = rows.find((x) => x.url === m.url);
      return r?.sort_order ?? 0;
    };
    if (a.kind === b.kind) return order(a) - order(b);
    if (a.kind === "hero") return -1;
    if (b.kind === "hero") return 1;
    return 0;
  };
