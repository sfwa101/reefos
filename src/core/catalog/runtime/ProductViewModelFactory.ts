/**
 * Factory — يجمع NormalizedProduct + capabilities + section context → VM.
 *
 * نقطة الدخول الوحيدة لتحويل entities إلى VMs المعروضة في الواجهات.
 */
import type {
  ProductCardVM,
  ProductDetailsVM,
  MediaRefVM,
  ProductVariantVM,
  ProductAddonVM,
  ProductNutritionVM,
  ProductRelationVM,
} from "../types";
import { resolveProductCapabilities } from "../resolvers/ProductCapabilityResolver";
import {
  derivePrice,
  deriveStock,
  deriveBadges,
  defaultHydrationContext,
  type HydrationContext,
} from "./ProductHydrationPipeline";
import type { NormalizedProduct } from "./ProductTransformers";

export interface BuildCardInput {
  product: NormalizedProduct;
  sectionSlug: string;
  sectionCapabilities: readonly string[];
  hero?: MediaRefVM;
  ctx?: HydrationContext;
}

export function buildProductCard(input: BuildCardInput): ProductCardVM {
  const ctx = input.ctx ?? defaultHydrationContext();
  const price = derivePrice(input.product, ctx);
  const stock = deriveStock(input.product);
  const capabilities = resolveProductCapabilities({
    product: input.product,
    sectionCapabilities: input.sectionCapabilities,
  });
  return {
    id: input.product.id,
    slug: input.product.slug,
    sku: input.product.sku ?? undefined,
    sectionId: input.product.sectionId,
    sectionSlug: input.sectionSlug,
    name: input.product.name,
    shortDescription: input.product.shortDescription,
    hero: input.hero,
    price,
    saleUnit: input.product.saleUnit,
    inStock: stock.inStock,
    isLowStock: stock.isLowStock,
    badges: deriveBadges(input.product, price, stock, ctx),
    tags: input.product.tags,
    rating: input.product.rating,
    capabilities,
    attributes: Object.freeze({ ...input.product.attributes }) as Readonly<Record<string, import("../types").JsonValue>>,
  };
}

export interface BuildDetailsInput extends BuildCardInput {
  gallery: readonly MediaRefVM[];
  variants: readonly ProductVariantVM[];
  addons: readonly ProductAddonVM[];
  nutrition?: ProductNutritionVM;
  relations: readonly ProductRelationVM[];
}

export function buildProductDetails(input: BuildDetailsInput): ProductDetailsVM {
  const card = buildProductCard(input);
  return {
    ...card,
    description: input.product.description,
    story: input.product.story,
    storageConditions: input.product.storageConditions,
    shelfLifeDays: input.product.shelfLifeDays ?? undefined,
    isPerishable: input.product.isPerishable,
    gallery: [...input.gallery],
    variants: [...input.variants].sort((a, b) => a.sortOrder - b.sortOrder),
    addons: [...input.addons].sort((a, b) => a.sortOrder - b.sortOrder),
    nutrition: input.nutrition,
    relations: [...input.relations],
    seasonalWindow: input.product.seasonalWindow,
  };
}
