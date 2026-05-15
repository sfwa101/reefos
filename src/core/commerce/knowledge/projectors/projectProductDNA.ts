/**
 * Salsabil OS — Constitution v2.0 · Phase 1 · Step 2
 * Layer 5 (Application/Transform) — Pure projector that lifts a legacy
 * `usa_products` row into a fully-formed `ProductCivilizationEntity`.
 *
 * Rules:
 *  - PURE. No DB calls, no I/O, no globals.
 *  - Tolerant. Accepts partial rows; missing fields fall back to safe defaults.
 *  - Non-destructive. Does not mutate the input row.
 */

import type {
  CivilizationEntity,
  ISODateString,
  I18nText,
  JsonObject,
  JsonValue,
  ProductBehavioralDNA,
  ProductCivilizationEntity,
  ProductDNA,
  ProductFinancialDNA,
  ProductIdentityDNA,
  ProductIntelligenceDNA,
  ProductSupplyDNA,
} from "../dna.types";

/**
 * Loose shape of a row coming from `public.usa_products`. Every field is
 * optional so we can absorb legacy variations without crashing.
 */
export interface UsaProductRow {
  id: string;
  slug?: string | null;
  sku?: string | null;
  section_id?: string | null;

  name_i18n?: JsonValue;
  short_description_i18n?: JsonValue;
  description_i18n?: JsonValue;
  story_i18n?: JsonValue;
  storage_conditions_i18n?: JsonValue;

  base_price?: number | string | null;
  compare_at_price?: number | string | null;
  wholesale_price?: number | string | null;
  member_price?: number | string | null;
  tax_class?: string | null;
  currency?: string | null;

  sale_unit?: string | null;
  stock_qty?: number | string | null;
  low_stock_threshold?: number | string | null;
  is_perishable?: boolean | null;
  shelf_life_days?: number | null;
  seasonal_window?: JsonValue;

  badges?: string[] | null;
  tags?: string[] | null;
  attributes?: JsonValue;

  popularity_score?: number | string | null;
  rating_avg?: number | string | null;
  rating_count?: number | null;

  is_active?: boolean | null;
  is_featured?: boolean | null;

  created_at?: string | null;
  updated_at?: string | null;
  deleted_at?: string | null;

  // Tolerate other unknown legacy columns.
  [key: string]: unknown;
}

// ────────────────────────────── helpers ─────────────────────────────────────

const num = (v: unknown, fallback = 0): number => {
  if (v === null || v === undefined || v === "") return fallback;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const optNum = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
};

const bool = (v: unknown, fallback = false): boolean =>
  typeof v === "boolean" ? v : fallback;

const str = (v: unknown, fallback = ""): string =>
  typeof v === "string" ? v : fallback;

const strList = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

const i18n = (v: unknown): I18nText => {
  if (v && typeof v === "object" && !Array.isArray(v)) {
    const out: I18nText = {};
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      if (typeof val === "string") out[k] = val;
    }
    return out;
  }
  return {};
};

const jsonObj = (v: unknown): JsonObject => {
  if (v && typeof v === "object" && !Array.isArray(v)) {
    return v as JsonObject;
  }
  return {};
};

const optJsonObj = (v: unknown): JsonObject | null => {
  if (v && typeof v === "object" && !Array.isArray(v)) {
    return v as JsonObject;
  }
  return null;
};

const iso = (v: unknown, fallback: ISODateString): ISODateString =>
  typeof v === "string" && v.length > 0 ? v : fallback;

// ────────────────────────────── layers ──────────────────────────────────────

const projectIdentity = (row: UsaProductRow): ProductIdentityDNA => ({
  id: row.id,
  slug: str(row.slug, row.id),
  sku: row.sku ?? null,
  name: i18n(row.name_i18n),
  short_description: i18n(row.short_description_i18n),
  description: i18n(row.description_i18n),
  story: i18n(row.story_i18n),
  section_id: row.section_id ?? null,
  tags: strList(row.tags),
  badges: strList(row.badges),
  is_active: bool(row.is_active, true),
  is_featured: bool(row.is_featured, false),
});

const projectFinancial = (row: UsaProductRow): ProductFinancialDNA => ({
  currency: str(row.currency, "EGP"),
  base_price: num(row.base_price, 0),
  compare_at_price: optNum(row.compare_at_price),
  wholesale_price: optNum(row.wholesale_price),
  member_price: optNum(row.member_price),
  tax_class: row.tax_class ?? null,
});

const projectBehavioral = (row: UsaProductRow): ProductBehavioralDNA => ({
  popularity_score: num(row.popularity_score, 0),
  rating_avg: num(row.rating_avg, 0),
  rating_count: num(row.rating_count, 0),
});

const projectSupply = (row: UsaProductRow): ProductSupplyDNA => ({
  sale_unit: str(row.sale_unit, "piece"),
  stock_qty: num(row.stock_qty, 0),
  low_stock_threshold: num(row.low_stock_threshold, 0),
  is_perishable: bool(row.is_perishable, false),
  shelf_life_days: row.shelf_life_days ?? null,
  storage_conditions: i18n(row.storage_conditions_i18n),
  seasonal_window: optJsonObj(row.seasonal_window),
});

const projectIntelligence = (row: UsaProductRow): ProductIntelligenceDNA => ({
  attributes: jsonObj(row.attributes),
  embeddings: [],
  ai_capabilities: [],
  inferred_labels: {},
});

// ─────────────────────────── public API ─────────────────────────────────────

/** Project the 5 DNA layers from a raw `usa_products` row. */
export function projectProductDNALayers(row: UsaProductRow): ProductDNA {
  return {
    identity: projectIdentity(row),
    financial: projectFinancial(row),
    behavioral: projectBehavioral(row),
    supply: projectSupply(row),
    intelligence: projectIntelligence(row),
  };
}

/**
 * Wrap a raw `usa_products` row in the universal `CivilizationEntity`
 * envelope, with `ProductDNA` as the typed `context` payload.
 */
export function projectProductDNA(
  row: UsaProductRow,
): ProductCivilizationEntity {
  const now: ISODateString = new Date().toISOString();
  const dna = projectProductDNALayers(row);

  const entity: CivilizationEntity<ProductDNA & JsonObject> = {
    entity_id: row.id,
    entity_type: "product",
    state: row.deleted_at
      ? "deleted"
      : bool(row.is_active, true)
        ? "active"
        : "paused",
    context: dna as ProductDNA & JsonObject,
    relationships: [],
    capabilities: [],
    memory: [],
    events: [],
    policies: [],
    created_at: iso(row.created_at, now),
    updated_at: iso(row.updated_at, now),
  };

  return entity;
}

/** Batch helper. */
export function projectProductDNABatch(
  rows: readonly UsaProductRow[],
): ProductCivilizationEntity[] {
  return rows.map(projectProductDNA);
}

// ─────────────────────── Sovereign Asset Projector ──────────────────────────
// WAVE R-1: native projector for `salsabil_assets` rows. Bridges the new
// Sovereign shape (id/name/description/category_path/traits/media) into the
// same `ProductCivilizationEntity` envelope without forcing callers to
// fabricate a fake `usa_products` row.

export interface SalsabilAssetRow {
  id: string;
  name?: string | null;
  description?: string | null;
  category_path?: string | null;
  asset_type?: string | null;
  traits?: JsonValue;
  media?: JsonValue;
  is_active?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
  deleted_at?: string | null;
  /** Optional joined SKU + contract context for richer DNA. */
  primary_sku?: { sku_code?: string | null; attributes?: JsonValue } | null;
  primary_contract?: {
    base_price?: number | string | null;
    currency?: string | null;
    compare_at_price?: number | string | null;
    wholesale_price?: number | string | null;
    member_price?: number | string | null;
    tax_class?: string | null;
  } | null;
  [key: string]: unknown;
}

/** Map a Sovereign Asset row into the legacy `UsaProductRow` shape so we
 *  can reuse the well-tested 5-layer projector without duplication. */
function assetToProductRow(asset: SalsabilAssetRow): UsaProductRow {
  const traits = jsonObj(asset.traits);
  const sku = asset.primary_sku ?? null;
  const contract = asset.primary_contract ?? null;
  const skuAttrs = jsonObj(sku?.attributes);
  const unit =
    typeof skuAttrs.unit === "string"
      ? (skuAttrs.unit as string)
      : typeof traits.unit === "string"
        ? (traits.unit as string)
        : null;
  return {
    id: asset.id,
    slug: typeof traits.slug === "string" ? (traits.slug as string) : asset.id,
    sku: sku?.sku_code ?? null,
    section_id: null,
    name_i18n: { ar: str(asset.name) } as unknown as JsonValue,
    description_i18n: asset.description
      ? ({ ar: asset.description } as unknown as JsonValue)
      : null,
    base_price: contract?.base_price ?? 0,
    compare_at_price: contract?.compare_at_price ?? null,
    wholesale_price: contract?.wholesale_price ?? null,
    member_price: contract?.member_price ?? null,
    currency: contract?.currency ?? "EGP",
    tax_class: contract?.tax_class ?? null,
    sale_unit: unit,
    is_perishable: traits.perishable === true,
    tags: Array.isArray(traits.tags)
      ? (traits.tags as unknown[]).filter((t): t is string => typeof t === "string")
      : null,
    badges: Array.isArray(traits.badges)
      ? (traits.badges as unknown[]).filter((t): t is string => typeof t === "string")
      : null,
    attributes: traits as unknown as JsonValue,
    is_active: asset.is_active ?? true,
    created_at: asset.created_at ?? null,
    updated_at: asset.updated_at ?? null,
    deleted_at: asset.deleted_at ?? null,
  };
}

export function projectAssetDNALayers(asset: SalsabilAssetRow): ProductDNA {
  return projectProductDNALayers(assetToProductRow(asset));
}

export function projectAssetDNA(asset: SalsabilAssetRow): ProductCivilizationEntity {
  return projectProductDNA(assetToProductRow(asset));
}

export function projectAssetDNABatch(
  assets: readonly SalsabilAssetRow[],
): ProductCivilizationEntity[] {
  return assets.map(projectAssetDNA);
}

