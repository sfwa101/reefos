/**
 * Runtime Engine — orchestrator يستقبل صفوف DB خام ويرجع VMs نهائية.
 *
 * هذه الطبقة لا تعرف من أين أتت البيانات (Postgres/cache/in-memory للاختبار).
 * مهمتها فقط: normalize → hydrate → adapt.
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

type Row<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export interface BuildCardsBatchInput {
  products: readonly Row<"usa_products">[];
  /** map: sectionId → { slug, capabilities[] } */
  sectionInfo: ReadonlyMap<string, { slug: string; capabilities: readonly string[] }>;
  /** map: productId → hero media row (optional). */
  heroMedia?: ReadonlyMap<string, Row<"product_media">>;
  ctx?: HydrationContext;
}

export function buildCardsBatch(input: BuildCardsBatchInput): ProductCardVM[] {
  const out: ProductCardVM[] = [];
  for (const row of input.products) {
    const product = normalizeProduct(row);
    const info = input.sectionInfo.get(product.sectionId);
    if (!info) continue; // قسم غير معروف — يتجاهل بدلاً من الانهيار
    const heroRow = input.heroMedia?.get(product.id);
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
  product: Row<"usa_products">;
  section: { slug: string; capabilities: readonly string[] };
  media: readonly Row<"product_media">[];
  variants: readonly Row<"product_variants_v2">[];
  addons: readonly Row<"product_addons">[];
  nutrition?: Row<"product_nutrition"> | null;
  relations: readonly Row<"product_relations">[];
  ctx?: HydrationContext;
}

export function buildDetails(input: BuildDetailsBatchInput): ProductDetailsVM {
  const product = normalizeProduct(input.product);
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
