/**
 * DB rows → domain entities (one shape transformers).
 * لا يقوم بأي حسابات (price discount, badges) — هذا دور الـ Hydration Pipeline.
 */
import type { Database } from "@/integrations/supabase/types";
import type {
  CurrencyCode,
  I18nText,
  ProductAddonVM,
  ProductNutritionVM,
  ProductRelationVM,
  ProductVariantVM,
  MediaRefVM,
} from "../types";

type ProductRow = Database["public"]["Tables"]["usa_products"]["Row"];
type MediaRow = Database["public"]["Tables"]["product_media"]["Row"];
type VariantRow = Database["public"]["Tables"]["product_variants_v2"]["Row"];
type AddonRow = Database["public"]["Tables"]["product_addons"]["Row"];
type NutritionRow = Database["public"]["Tables"]["product_nutrition"]["Row"];
type RelationRow = Database["public"]["Tables"]["product_relations"]["Row"];

export interface NormalizedProduct {
  id: string;
  slug: string;
  sku: string | null;
  sectionId: string;
  name: I18nText;
  shortDescription?: I18nText;
  description?: I18nText;
  story?: I18nText;
  storageConditions?: I18nText;
  basePrice: number;
  compareAtPrice: number | null;
  wholesalePrice: number | null;
  memberPrice: number | null;
  currency: CurrencyCode;
  saleUnit: string;
  stockQty: number;
  lowStockThreshold: number;
  isPerishable: boolean;
  shelfLifeDays: number | null;
  badges: string[];
  tags: string[];
  attributes: Record<string, unknown>;
  popularity: number;
  rating: { avg: number; count: number };
  isActive: boolean;
  isFeatured: boolean;
  seasonalWindow?: { startsAt: string; endsAt: string };
}

const isI18n = (v: unknown): v is { ar?: unknown; en?: unknown } =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const toI18n = (v: unknown, fallback = ""): I18nText => {
  if (typeof v === "string") return { ar: v };
  if (isI18n(v)) {
    const ar = typeof v.ar === "string" ? v.ar : fallback;
    const en = typeof v.en === "string" ? v.en : undefined;
    return en ? { ar, en } : { ar };
  }
  return { ar: fallback };
};

const toI18nOptional = (v: unknown): I18nText | undefined => {
  if (!v) return undefined;
  if (typeof v === "string" && v.length === 0) return undefined;
  if (isI18n(v) && !v.ar && !v.en) return undefined;
  return toI18n(v);
};

const toCurrency = (v: string): CurrencyCode =>
  v === "USD" || v === "EUR" ? v : "EGP";

const toRecord = (v: unknown): Record<string, unknown> =>
  isI18n(v) ? (v as Record<string, unknown>) : {};

const toSeasonal = (v: unknown): NormalizedProduct["seasonalWindow"] => {
  if (!v || typeof v !== "object" || Array.isArray(v)) return undefined;
  const obj = v as Record<string, unknown>;
  const startsAt = typeof obj.startsAt === "string" ? obj.startsAt : undefined;
  const endsAt = typeof obj.endsAt === "string" ? obj.endsAt : undefined;
  return startsAt && endsAt ? { startsAt, endsAt } : undefined;
};

export function normalizeProduct(row: ProductRow): NormalizedProduct {
  return {
    id: row.id,
    slug: row.slug,
    sku: row.sku,
    sectionId: row.section_id,
    name: toI18n(row.name_i18n, row.slug),
    shortDescription: toI18nOptional(row.short_description_i18n),
    description: toI18nOptional(row.description_i18n),
    story: toI18nOptional(row.story_i18n),
    storageConditions: toI18nOptional(row.storage_conditions_i18n),
    basePrice: Number(row.base_price ?? 0),
    compareAtPrice: row.compare_at_price !== null ? Number(row.compare_at_price) : null,
    wholesalePrice: row.wholesale_price !== null ? Number(row.wholesale_price) : null,
    memberPrice: row.member_price !== null ? Number(row.member_price) : null,
    currency: toCurrency(row.currency),
    saleUnit: row.sale_unit,
    stockQty: Number(row.stock_qty ?? 0),
    lowStockThreshold: Number(row.low_stock_threshold ?? 0),
    isPerishable: row.is_perishable,
    shelfLifeDays: row.shelf_life_days,
    badges: row.badges ?? [],
    tags: row.tags ?? [],
    attributes: toRecord(row.attributes),
    popularity: Number(row.popularity_score ?? 0),
    rating: { avg: Number(row.rating_avg ?? 0), count: row.rating_count ?? 0 },
    isActive: row.is_active,
    isFeatured: row.is_featured,
    seasonalWindow: toSeasonal(row.seasonal_window),
  };
}

export function normalizeMedia(row: MediaRow): MediaRefVM {
  return {
    url: row.url,
    alt: toI18n(row.alt_i18n),
    width: row.width ?? undefined,
    height: row.height ?? undefined,
    kind: row.kind,
    blurhash: typeof toRecord(row.metadata).blurhash === "string"
      ? (toRecord(row.metadata).blurhash as string)
      : undefined,
  };
}

export function normalizeVariant(row: VariantRow): ProductVariantVM {
  return {
    id: row.id,
    axisKey: row.axis_key,
    axisValue: row.axis_value,
    axisValueLabel: toI18n(row.axis_value_i18n, row.axis_value),
    priceDelta: Number(row.price_delta ?? 0),
    isDefault: row.is_default,
    isActive: row.is_active,
    inStock: Number(row.stock ?? 0) > 0,
    imageUrl: row.image_url ?? undefined,
    sortOrder: row.sort_order,
  };
}

export function normalizeAddon(row: AddonRow): ProductAddonVM {
  return {
    id: row.id,
    groupKey: row.group_key,
    groupLabel: toI18n(row.group_name_i18n, row.group_key),
    label: toI18n(row.name_i18n),
    kind: row.kind,
    priceDelta: Number(row.price_delta ?? 0),
    isRequired: row.is_required,
    maxQty: row.max_qty,
    sortOrder: row.sort_order,
  };
}

export function normalizeNutrition(row: NutritionRow): ProductNutritionVM {
  return {
    per100g: toRecord(row.per_100g) as Record<string, number>,
    perServing: row.per_serving ? (toRecord(row.per_serving) as Record<string, number>) : undefined,
    servingSizeG: row.serving_size_g !== null ? Number(row.serving_size_g) : undefined,
    allergens: row.allergens ?? [],
    dietFlags: toRecord(row.diet_flags) as Record<string, boolean>,
    ingredients: toI18nOptional(row.ingredients_i18n),
  };
}

export function normalizeRelation(row: RelationRow): ProductRelationVM {
  return {
    relatedId: row.related_id,
    relationType: row.relation_type,
    strength: Number(row.strength ?? 0),
  };
}
