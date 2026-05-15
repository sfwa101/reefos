/**
 * SovereignCatalogGateway — Sovereign boundary for the Universal Sovereign
 * Catalog (salsabil_assets ⇄ salsabil_skus ⇄ salsabil_financial_contracts ⇄
 * salsabil_inventory_matrix). Wave P-3 Sub-Wave 11.
 *
 * Constitutional contract:
 *   • Only place permitted to read/write the Sovereign catalog tables from
 *     UI-facing code paths in the catalog/POS/admin families.
 *   • Returns typed DTOs (or raw asset rows where the caller needs to
 *     project into multiple legacy shapes).
 *   • Realtime subscriptions for catalog tables would also live here
 *     (none today).
 *
 * This file is a relocation of the historical `src/lib/sovereignCatalog.ts`
 * — the legacy path is preserved as a pure re-export shim so existing
 * callers continue to compile while migration completes.
 */
import { supabase } from "@/integrations/supabase/client";
import type { PackagingOptionVM, Product, ProductSource } from "@/core/catalog/legacyProduct.types";
import { dynamicSb } from "@/integrations/supabase/dynamic";
import { Tracer } from "@/core/system/observability/Tracer";

const FALLBACK_IMG =
  "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23f3f4f6'/%3E%3C/svg%3E";

export const toLegacyAssetId = (assetId: string): string =>
  `usa_${assetId.replace(/-/g, "")}`;

export const fromLegacyAssetId = (legacy: string): string | null => {
  if (!legacy.startsWith("usa_")) return null;
  const hex = legacy.slice(4);
  if (hex.length !== 32) return null;
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};

const pickImage = (media: unknown): string | null => {
  if (Array.isArray(media) && media.length > 0) {
    const first = media[0];
    if (typeof first === "string") return first;
    if (first && typeof first === "object") {
      const r = first as Record<string, unknown>;
      const u = (r.url ?? r.src ?? r.path) as string | undefined;
      if (u) return u;
    }
  }
  if (media && typeof media === "object") {
    const r = media as Record<string, unknown>;
    const u = (r.url ?? r.src) as string | undefined;
    if (u) return u;
  }
  return null;
};

const sourceFromCategory = (path: string | null): ProductSource => {
  if (!path) return "supermarket";
  const head = path.split("/")[0]?.toLowerCase() ?? "";
  const map: Record<string, ProductSource> = {
    supermarket: "supermarket", kitchen: "kitchen", dairy: "dairy",
    produce: "produce", recipes: "recipes", pharmacy: "pharmacy",
    library: "library", wholesale: "wholesale", home: "home",
    village: "village", baskets: "baskets", restaurants: "restaurants",
    meat: "meat", sweets: "sweets",
  };
  return map[head] ?? "supermarket";
};

type RawSku = {
  id: string;
  sku_code: string;
  attributes: Record<string, unknown> | null;
  sort_order: number | null;
  is_active: boolean | null;
  barcode: string | null;
  salsabil_financial_contracts: Array<{
    base_price: number | string | null;
    contract_rules: Record<string, unknown> | null;
  }> | null;
  salsabil_inventory_matrix: Array<{
    availability_data: Record<string, unknown> | null;
  }> | null;
};

type RawPackagingTier = {
  id: string;
  asset_id?: string;
  parent_tier_id: string | null;
  tier_label: string;
  uom_code: string | null;
  conversion_to_parent: number | string | null;
  conversion_to_base: number | string | null;
  barcode: string | null;
  price_override: number | string | null;
  is_stock_keeping: boolean | null;
  is_default_sell: boolean | null;
  is_active: boolean | null;
  sort_order: number | null;
};

type RawAsset = {
  id: string;
  name: string;
  description: string | null;
  category_path: string | null;
  traits: Record<string, unknown> | null;
  media: unknown;
  is_active: boolean;
  salsabil_skus: RawSku[] | null;
  salsabil_packaging_tiers?: RawPackagingTier[] | null;
};

const PACKAGING_TIER_FIELDS = `
  id, parent_tier_id, tier_label, uom_code,
  conversion_to_parent, conversion_to_base, barcode, price_override,
  is_stock_keeping, is_default_sell, is_active, sort_order
` as const;

const SOVEREIGN_SELECT = `
  id, name, description, category_path, traits, media, is_active,
  salsabil_skus (
    id, sku_code, attributes, sort_order, is_active, barcode,
    salsabil_financial_contracts ( base_price, contract_rules ),
    salsabil_inventory_matrix ( availability_data )
  ),
  salsabil_packaging_tiers ( ${PACKAGING_TIER_FIELDS} )
` as const;

const pickPrimarySku = (skus: RawSku[]): RawSku | undefined => {
  const ordered = [...skus].sort(
    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
  );
  return ordered.find((s) => s.is_active !== false) ?? ordered[0];
};

const skuStock = (sku: RawSku | undefined): number => {
  const inv = sku?.salsabil_inventory_matrix?.[0]?.availability_data;
  if (!inv) return 0;
  const v = (inv as Record<string, unknown>).stock;
  return typeof v === "number" ? v : Number(v ?? 0) || 0;
};

const skuPrice = (sku: RawSku | undefined): number => {
  const c = sku?.salsabil_financial_contracts?.[0];
  return c?.base_price != null ? Number(c.base_price) : 0;
};

const skuCost = (sku: RawSku | undefined): number | null => {
  const c = sku?.salsabil_financial_contracts?.[0]?.contract_rules;
  if (!c) return null;
  const v = (c as Record<string, unknown>).cost_price;
  if (v == null) return null;
  return typeof v === "number" ? v : Number(v) || null;
};

/* ── Public Product shape (matches legacy `useProductsQuery` mapping) ── */

const toNumberOr = (v: unknown, fallback: number): number => {
  if (v == null) return fallback;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
};

/**
 * Wave P-9 — translate raw `salsabil_packaging_tiers` rows into UI-facing
 * `PackagingOptionVM[]`. Pure, side-effect-free. Returns [] when the asset
 * has no tiers (preserves backward compatibility for legacy callers).
 */
export function buildPackagingOptions(
  rawTiers: RawPackagingTier[] | null | undefined,
  skuBasePrice: number,
): PackagingOptionVM[] {
  if (!rawTiers || rawTiers.length === 0) return [];
  return rawTiers
    .filter((t) => t.is_active !== false)
    .map<PackagingOptionVM>((t) => {
      const override = t.price_override != null ? Number(t.price_override) : null;
      const hasOverride = override != null && Number.isFinite(override);
      const unit_price = hasOverride
        ? (override as number)
        : Number.isFinite(skuBasePrice) ? skuBasePrice : 0;
      const price_source: PackagingOptionVM["price_source"] = hasOverride
        ? "tier_override"
        : (Number.isFinite(skuBasePrice) && skuBasePrice > 0 ? "sku_base" : "none");
      return {
        tier_id: t.id,
        parent_tier_id: t.parent_tier_id,
        label: t.tier_label,
        uom_code: t.uom_code,
        conversion_to_parent: toNumberOr(t.conversion_to_parent, 1),
        conversion_to_base: toNumberOr(t.conversion_to_base, 1),
        unit_price,
        price_source,
        barcode: t.barcode,
        is_default_sell: t.is_default_sell === true,
        is_stock_keeping: t.is_stock_keeping === true,
        sort_order: t.sort_order ?? 0,
      };
    })
    .sort((a, b) => a.sort_order - b.sort_order);
}

export function assetToProduct(row: RawAsset): Product | null {
  const skus = row.salsabil_skus ?? [];
  const primary = pickPrimarySku(skus);
  if (!primary) return null;

  const traits = row.traits ?? {};
  const attrs = primary.attributes ?? {};
  const oldPriceRaw = (traits as Record<string, unknown>).old_price;
  const oldPrice = typeof oldPriceRaw === "number"
    ? oldPriceRaw
    : typeof oldPriceRaw === "string" ? Number(oldPriceRaw) : undefined;

  const subCategory = row.category_path && row.category_path.includes("/")
    ? row.category_path.split("/").slice(1).join("/")
    : undefined;
  const category = row.category_path?.split("/")[0]
    ?? (traits.category as string | undefined) ?? "general";

  const attrsRec = attrs as Record<string, unknown>;
  const wakalahEligible = attrsRec.wakalah_eligible === true;
  const hideOnZero = attrsRec.hide_on_zero === true;
  const lowStockRaw = attrsRec.low_stock_threshold;
  const lowStockThreshold =
    typeof lowStockRaw === "number"
      ? lowStockRaw
      : Number(lowStockRaw ?? 10) || 10;

  const packagingTiers = buildPackagingOptions(row.salsabil_packaging_tiers, skuPrice(primary));
  const defaultTierId =
    packagingTiers.find((t) => t.is_default_sell)?.tier_id
    ?? packagingTiers[0]?.tier_id
    ?? null;

  return {
    id: toLegacyAssetId(row.id),
    name: row.name,
    brand: (traits.brand as string | undefined) ?? undefined,
    unit: (attrs.unit as string | undefined)
      ?? (attrs.size as string | undefined)
      ?? (traits.unit as string | undefined) ?? "وحدة",
    price: skuPrice(primary),
    oldPrice: oldPrice && Number.isFinite(oldPrice) ? oldPrice : undefined,
    image: pickImage(row.media) ?? FALLBACK_IMG,
    rating: typeof traits.rating === "number" ? (traits.rating as number) : undefined,
    category,
    subCategory,
    source: sourceFromCategory(row.category_path),
    badge: (traits.badge as Product["badge"]) ?? undefined,
    perishable: (traits.perishable as boolean | undefined) ?? undefined,
    stock: skuStock(primary),
    wakalahEligible,
    hideOnZero,
    lowStockThreshold,
    metadata: {
      ...(traits as Record<string, unknown>),
      usa_asset_id: row.id,
      usa_sku_id: primary.id,
      wakalah_eligible: wakalahEligible,
      hide_on_zero: hideOnZero,
      low_stock_threshold: lowStockThreshold,
    },
    description: row.description ?? undefined,
    packagingTiers,
    defaultTierId,
  };
}

/* ── Storefront & restaurants ── */

export type RestoProductRow = {
  id: string;
  name: string;
  brand: string | null;
  price: number;
  image: string | null;
  rating: number | null;
  source: string | null;
  fulfillment_type: string | null;
  description: string | null;
  metadata: Record<string, unknown> | null;
};

export function assetToRestoProduct(row: RawAsset): RestoProductRow | null {
  const primary = pickPrimarySku(row.salsabil_skus ?? []);
  if (!primary) return null;
  const traits = row.traits ?? {};
  return {
    id: toLegacyAssetId(row.id),
    name: row.name,
    brand: (traits.brand as string | undefined) ?? null,
    price: skuPrice(primary),
    image: pickImage(row.media),
    rating: typeof traits.rating === "number" ? (traits.rating as number) : null,
    source: sourceFromCategory(row.category_path),
    fulfillment_type: (traits.fulfillment_type as string | undefined) ?? null,
    description: row.description ?? null,
    metadata: traits,
  };
}

export async function fetchRestaurantAssets(): Promise<RestoProductRow[]> {
  const { data, error } = await supabase
    .from("salsabil_assets")
    .select(SOVEREIGN_SELECT)
    .eq("is_active", true)
    .ilike("category_path", "restaurants%")
    .limit(2000);
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as RawAsset[])
    .map(assetToRestoProduct)
    .filter((r): r is RestoProductRow => r != null);
}

/* ── POS ── */

export type PosProductRow = {
  id: string;
  name: string;
  price: number;
  stock: number;
  is_active: boolean;
  barcode: string | null;
  image_url: string | null;
  category: string;
};

export async function fetchPosCatalog(): Promise<PosProductRow[]> {
  const { data, error } = await supabase
    .from("salsabil_assets")
    .select(SOVEREIGN_SELECT)
    .eq("is_active", true)
    .eq("asset_type", "physical")
    .limit(2000);
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as unknown as RawAsset[];
  const out: PosProductRow[] = [];
  for (const row of rows) {
    const sku = pickPrimarySku(row.salsabil_skus ?? []);
    if (!sku) continue;
    out.push({
      id: toLegacyAssetId(row.id),
      name: row.name,
      price: skuPrice(sku),
      stock: skuStock(sku),
      is_active: row.is_active,
      barcode: sku.barcode,
      image_url: pickImage(row.media),
      category: row.category_path?.split("/")[0] ?? "general",
    });
  }
  return out;
}

/* ── Admin: SKU-keyed rows for inventory & cost editing ── */

export type SkuAdminRow = {
  id: string;            // sku_id (used for upserts)
  asset_id: string;
  name: string;
  unit: string;
  price: number;
  stock: number;
  is_active: boolean;
  source: string;
  category: string;
  cost_price: number | null;
  affiliate_commission_pct: number;
};

export async function fetchAdminCatalog(): Promise<SkuAdminRow[]> {
  const { data, error } = await supabase
    .from("salsabil_assets")
    .select(SOVEREIGN_SELECT)
    .order("name")
    .limit(2000);
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as unknown as RawAsset[];
  const out: SkuAdminRow[] = [];
  for (const row of rows) {
    const sku = pickPrimarySku(row.salsabil_skus ?? []);
    if (!sku) continue;
    const traits = row.traits ?? {};
    const attrs = sku.attributes ?? {};
    const aff = (traits as Record<string, unknown>).affiliate_commission_pct;
    out.push({
      id: sku.id,
      asset_id: row.id,
      name: row.name,
      unit: (attrs.unit as string | undefined)
        ?? (traits.unit as string | undefined) ?? "وحدة",
      price: skuPrice(sku),
      stock: skuStock(sku),
      is_active: row.is_active && (sku.is_active ?? true),
      source: sourceFromCategory(row.category_path),
      category: row.category_path?.split("/")[0] ?? "general",
      cost_price: skuCost(sku),
      affiliate_commission_pct: typeof aff === "number" ? aff : Number(aff ?? 0) || 0,
    });
  }
  return out;
}

/* ── Sovereign Mutations ── */

/** Global/default location placeholder for ledger entries lacking explicit warehouse routing. */
const DEFAULT_LEDGER_LOCATION_ID = "00000000-0000-0000-0000-000000000000";

/** Upsert availability_data.stock for a sku (merges with existing JSON). */
export async function upsertSkuStock(skuId: string, stock: number): Promise<void> {
  const { data: existing } = await supabase
    .from("salsabil_inventory_matrix")
    .select("id, availability_data")
    .eq("sku_id", skuId)
    .is("location_code", null)
    .maybeSingle();
  const existingAvailability = (existing?.availability_data as { stock?: unknown } | null) ?? null;
  const oldStockRaw = existingAvailability?.stock;
  const oldStock = typeof oldStockRaw === "number"
    ? oldStockRaw
    : Number(oldStockRaw ?? 0) || 0;
  const merged = { ...(existing?.availability_data as object ?? {}), stock };
  if (existing?.id) {
    const { error } = await supabase
      .from("salsabil_inventory_matrix")
      .update({ availability_data: merged })
      .eq("id", existing.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from("salsabil_inventory_matrix")
      .insert({ sku_id: skuId, inventory_type: "count", availability_data: merged });
    if (error) throw new Error(error.message);
  }

  // ─── Dual-Write Bridge: append `adjust` event to inventory ledger (fail-safe) ───
  const delta = stock - oldStock;
  if (delta !== 0) {
    try {
      const { appendLedgerEventFn } = await import(
        "@/core/inventory/gateway/inventory.functions"
      );
      const { data: auth } = await supabase.auth.getUser();
      await appendLedgerEventFn({
        data: {
          entity_id: skuId,
          location_id: DEFAULT_LEDGER_LOCATION_ID,
          event_type: "adjust",
          delta,
          idempotency_key: `adjust_${skuId}_${Date.now()}`,
          actor_id: auth?.user?.id ?? null,
          context: { source: "admin.upsertSkuStock", old_stock: oldStock, new_stock: stock },
        },
      });
    } catch (err) {
      Tracer.error("catalog", "inventory_ledger_dual_write_failed", err);
    }
  }
}

/** Update or create a base_price contract for a sku. */
export async function upsertSkuPrice(skuId: string, price: number): Promise<void> {
  const { data: existing } = await supabase
    .from("salsabil_financial_contracts")
    .select("id")
    .eq("sku_id", skuId)
    .eq("is_active", true)
    .maybeSingle();
  if (existing?.id) {
    const { error } = await supabase
      .from("salsabil_financial_contracts")
      .update({ base_price: price })
      .eq("id", existing.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from("salsabil_financial_contracts")
      .insert({ sku_id: skuId, pricing_model: "flat", base_price: price });
    if (error) throw new Error(error.message);
  }
}

/** Patch contract_rules.cost_price (Moving Avg or manual cost). */
export async function upsertSkuCost(skuId: string, cost: number): Promise<void> {
  const { data: existing } = await supabase
    .from("salsabil_financial_contracts")
    .select("id, contract_rules")
    .eq("sku_id", skuId)
    .eq("is_active", true)
    .maybeSingle();
  const merged = { ...(existing?.contract_rules as object ?? {}), cost_price: cost };
  if (existing?.id) {
    const { error } = await supabase
      .from("salsabil_financial_contracts")
      .update({ contract_rules: merged })
      .eq("id", existing.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from("salsabil_financial_contracts")
      .insert({
        sku_id: skuId, pricing_model: "flat", base_price: 0,
        contract_rules: merged,
      });
    if (error) throw new Error(error.message);
  }
}

/** Patch traits.affiliate_commission_pct on the asset for a sku. */
export async function upsertAssetAffiliatePct(assetId: string, pct: number): Promise<void> {
  const { data: row } = await supabase
    .from("salsabil_assets")
    .select("traits")
    .eq("id", assetId)
    .maybeSingle();
  const merged = { ...(row?.traits as object ?? {}), affiliate_commission_pct: pct };
  const { error } = await supabase
    .from("salsabil_assets")
    .update({ traits: merged })
    .eq("id", assetId);
  if (error) throw new Error(error.message);
}

/* ── Lookups ── */

export async function fetchAssetsByLegacyIds(legacyIds: string[]): Promise<RawAsset[]> {
  const realIds = legacyIds
    .map(fromLegacyAssetId)
    .filter((x): x is string => x != null);
  if (realIds.length === 0) return [];
  const { data, error } = await supabase
    .from("salsabil_assets")
    .select(SOVEREIGN_SELECT)
    .in("id", realIds);
  if (error) return [];
  return (data ?? []) as unknown as RawAsset[];
}

/** Search by asset name (used by Omni-Search & paginated catalog). */
export async function searchSovereignAssets(opts: {
  q?: string;
  source?: ProductSource | null;
  sources?: ReadonlyArray<ProductSource>;
  subCategory?: string;
  offset?: number;
  limit?: number;
}): Promise<RawAsset[]> {
  let q = supabase
    .from("salsabil_assets")
    .select(SOVEREIGN_SELECT)
    .eq("is_active", true);
  if (opts.source) q = q.ilike("category_path", `${opts.source}%`);
  if (opts.sources && opts.sources.length > 0) {
    const ors = opts.sources.map((s) => `category_path.ilike.${s}%`).join(",");
    q = q.or(ors);
  }
  if (opts.subCategory) q = q.ilike("category_path", `%/${opts.subCategory}%`);
  if (opts.q && opts.q.trim()) {
    const safe = opts.q.trim().replace(/[%,()]/g, (m) => `\\${m}`);
    q = q.ilike("name", `%${safe}%`);
  }
  const offset = opts.offset ?? 0;
  const limit = opts.limit ?? 50;
  q = q.range(offset, offset + limit - 1);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as unknown as RawAsset[];
}

/* ── Wave P-3 Sub-Wave 11 additions ─────────────────────────────────────── *
 * Catalog reads previously performed inline by `useProductsQuery` and
 * `useSectionSubcategories`, plus the `product_requests` insert from
 * `RequestProductForm`. Pulled behind the gateway here.
 * ───────────────────────────────────────────────────────────────────────── */

/** Lighter raw shape (no media) used by useProductsQuery's home/source paths. */
export type CatalogQueryRow = {
  id: string;
  name: string;
  description: string | null;
  category_path: string | null;
  traits: Record<string, unknown> | null;
  media?: unknown;
  salsabil_skus: Array<{
    id: string;
    sku_code: string;
    attributes: Record<string, unknown> | null;
    sort_order: number | null;
    is_active: boolean | null;
    salsabil_financial_contracts: Array<{
      base_price: number | string | null;
      currency: string | null;
    }> | null;
    salsabil_inventory_matrix: Array<{
      availability_data: Record<string, unknown> | null;
    }> | null;
  }> | null;
  salsabil_packaging_tiers?: RawPackagingTier[] | null;
};

const QUERY_FULL_SELECT = `
  id, name, description, category_path, traits, media,
  salsabil_skus (
    id, sku_code, attributes, sort_order, is_active,
    salsabil_financial_contracts ( base_price, currency ),
    salsabil_inventory_matrix ( availability_data )
  ),
  salsabil_packaging_tiers ( ${PACKAGING_TIER_FIELDS} )
`;

const QUERY_MINIMAL_SELECT = `
  id, name, description, category_path, traits,
  salsabil_skus (
    id, sku_code, attributes, sort_order, is_active,
    salsabil_financial_contracts ( base_price, currency ),
    salsabil_inventory_matrix ( availability_data )
  ),
  salsabil_packaging_tiers ( ${PACKAGING_TIER_FIELDS} )
`;

/** Full catalog snapshot (heavy `media` included) for the SWR-cached grid. */
export async function fetchCatalogQueryRows(): Promise<CatalogQueryRow[]> {
  const { data, error } = await supabase
    .from("salsabil_assets")
    .select(QUERY_FULL_SELECT)
    .eq("is_active", true)
    .eq("asset_type", "physical")
    .order("created_at", { ascending: false })
    .limit(2000);
  if (error) {
    Tracer.error("catalog", "sovereign_fetch_failed", error);
    return [];
  }
  return (data ?? []) as unknown as CatalogQueryRow[];
}

/** Minimal-payload home/source slice (excludes `media`). */
export async function fetchCatalogHomeRows(
  limit: number,
  source?: string | null,
): Promise<CatalogQueryRow[]> {
  let q = supabase
    .from("salsabil_assets")
    .select(QUERY_MINIMAL_SELECT)
    .eq("is_active", true)
    .eq("asset_type", "physical")
    .order("created_at", { ascending: false })
    .limit(limit * 2);
  if (source) q = q.ilike("category_path", `${source}%`);
  const { data, error } = await q;
  if (error) {
    Tracer.error("catalog", "home_products_fetch_failed", error);
    return [];
  }
  return (data ?? []) as unknown as CatalogQueryRow[];
}

/** Distinct subcategory paths under a section slug (for pill filter UI). */
export async function fetchSectionCategoryPaths(
  sectionSlug: string,
): Promise<string[]> {
  const { data } = await supabase
    .from("salsabil_assets")
    .select("category_path")
    .eq("is_active", true)
    .eq("asset_type", "physical")
    .ilike("category_path", `${sectionSlug}/%`);
  if (!data) return [];
  return (data as Array<{ category_path: string | null }>)
    .map((r) => r.category_path)
    .filter((p): p is string => typeof p === "string");
}

/** Insert a customer "wishlist" product request (search-empty fallback). */
export async function insertProductRequest(
  payload: Record<string, unknown>,
): Promise<{ error: string | null }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await dynamicSb
    .from("product_requests")
    .insert(payload);
  return { error: error?.message ?? null };
}

// ════════════════════════════════════════════════════════════════════════════
// Wave Cleanup-B — Catalog Gateway Consolidation.
//
// The legacy `catalogGateway` facade (ProductCardVM/ProductDetailsVM), the
// TanStack queryOptions helpers (`catalogQueries`), the cache invalidation
// helpers (`catalogCache`), and the CommerceEntity-shaped `CatalogGateway`
// (formerly at `@/core/commerce/gateway/CatalogGateway`) all live HERE.
// One sovereign module — zero duplicate gateways.
// ════════════════════════════════════════════════════════════════════════════
import { queryOptions, type QueryClient } from "@tanstack/react-query";
import { CatalogService, type PriceQuoteLineInput } from "@/core/catalog/service/CatalogService";
import type { PriceQuoteVM } from "@/core/catalog/service/catalog.functions";
import { getSectionIdentityFn, listSectionsFn } from "@/core/sections/sections.functions";
import type {
  ProductCardVM,
  ProductDetailsVM,
  ProductListVM,
  ProductRelationVM,
} from "@/core/catalog/types";
import type { SectionIdentity } from "@/core/sections/types";
import {
  commerceEntityFromCard,
  type CommerceEntity,
} from "@/core/commerce/entity/CommerceEntity";

export interface ListSectionParams {
  slug: string;
  limit?: number;
  offset?: number;
  sort?: "popularity" | "new" | "price_asc" | "price_desc" | "seasonal";
}

export const catalogGateway = {
  // ─── Sections ───
  listSections(): Promise<SectionIdentity[]> {
    return listSectionsFn();
  },
  getSection(slug: string): Promise<SectionIdentity | null> {
    return getSectionIdentityFn({ data: { slug } });
  },

  // ─── Listing ───
  listSection(params: ListSectionParams): Promise<ProductListVM> {
    return CatalogService.listBySection({
      sectionSlug: params.slug,
      limit: params.limit,
      offset: params.offset,
      sort: params.sort,
    });
  },

  // ─── Details ───
  getDetails(slug: string): Promise<ProductDetailsVM | null> {
    return CatalogService.getDetails(slug);
  },

  // ─── Cart hydration / static-catalog killer ───
  getManyById(ids: readonly string[]): Promise<ProductCardVM[]> {
    return CatalogService.getManyById(ids);
  },
  getDetailsById(id: string): Promise<ProductDetailsVM | null> {
    return CatalogService.getDetailsById(id);
  },
  priceQuote(lines: readonly PriceQuoteLineInput[]): Promise<PriceQuoteVM> {
    return CatalogService.priceQuote(lines);
  },

  // ─── Recommendations ───
  getRelations(productId: string, limit = 12): Promise<ProductRelationVM[]> {
    return CatalogService.getRelations(productId, undefined, limit);
  },

  // ─── Curated rails ───
  trending(slug: string, limit = 12): Promise<ProductCardVM[]> {
    return CatalogService.listBySection({ sectionSlug: slug, sort: "popularity", limit }).then(
      (r) => r.items,
    );
  },
  newArrivals(slug: string, limit = 12): Promise<ProductCardVM[]> {
    return CatalogService.listBySection({ sectionSlug: slug, sort: "new", limit }).then(
      (r) => r.items,
    );
  },
  offers(slug: string, limit = 12): Promise<ProductCardVM[]> {
    return CatalogService.listBySection({ sectionSlug: slug, sort: "price_desc", limit }).then(
      (r) => r.items.filter((p) => p.price.compareAt && p.price.compareAt > p.price.amount),
    );
  },
};

export type CatalogGatewayFacade = typeof catalogGateway;

// ─── TanStack Query options (formerly catalogQueries.ts) ──────────────────
export const catalogKeys = {
  all: ["catalog"] as const,
  sections: () => [...catalogKeys.all, "sections"] as const,
  section: (slug: string) => [...catalogKeys.all, "section", slug] as const,
  list: (p: ListSectionParams) =>
    [...catalogKeys.all, "list", p.slug, p.sort ?? "popularity", p.limit ?? 24, p.offset ?? 0] as const,
  details: (slug: string) => [...catalogKeys.all, "details", slug] as const,
  relations: (id: string) => [...catalogKeys.all, "relations", id] as const,
  trending: (slug: string, limit = 12) => [...catalogKeys.all, "trending", slug, limit] as const,
  offers: (slug: string, limit = 12) => [...catalogKeys.all, "offers", slug, limit] as const,
};

export const sectionsQuery = () =>
  queryOptions({
    queryKey: catalogKeys.sections(),
    queryFn: () => catalogGateway.listSections(),
    staleTime: 5 * 60_000,
  });

export const sectionQuery = (slug: string) =>
  queryOptions({
    queryKey: catalogKeys.section(slug),
    queryFn: () => catalogGateway.getSection(slug),
    staleTime: 5 * 60_000,
  });

export const sectionListQuery = (params: ListSectionParams) =>
  queryOptions({
    queryKey: catalogKeys.list(params),
    queryFn: () => catalogGateway.listSection(params),
    staleTime: 60_000,
  });

export const productDetailsQuery = (slug: string) =>
  queryOptions({
    queryKey: catalogKeys.details(slug),
    queryFn: () => catalogGateway.getDetails(slug),
    staleTime: 60_000,
  });

export const productRelationsQuery = (productId: string) =>
  queryOptions({
    queryKey: catalogKeys.relations(productId),
    queryFn: () => catalogGateway.getRelations(productId),
    staleTime: 5 * 60_000,
  });

export const trendingQuery = (slug: string, limit = 12) =>
  queryOptions({
    queryKey: catalogKeys.trending(slug, limit),
    queryFn: () => catalogGateway.trending(slug, limit),
    staleTime: 60_000,
  });

export const offersQuery = (slug: string, limit = 12) =>
  queryOptions({
    queryKey: catalogKeys.offers(slug, limit),
    queryFn: () => catalogGateway.offers(slug, limit),
    staleTime: 60_000,
  });

// ─── Cache helpers (formerly catalogCache.ts) ──────────────────────────────
export const catalogCache = {
  invalidateAll(qc: QueryClient) {
    return qc.invalidateQueries({ queryKey: catalogKeys.all });
  },
  invalidateSection(qc: QueryClient, slug: string) {
    return qc.invalidateQueries({ queryKey: catalogKeys.section(slug) });
  },
  invalidateProduct(qc: QueryClient, slug: string) {
    return qc.invalidateQueries({ queryKey: catalogKeys.details(slug) });
  },
  prefetchSection(qc: QueryClient, slug: string) {
    return qc.prefetchQuery(sectionListQuery({ slug }));
  },
  prefetchProduct(qc: QueryClient, slug: string) {
    return qc.prefetchQuery(productDetailsQuery(slug));
  },
};

// ─── CommerceEntity facade (formerly commerce/gateway/CatalogGateway.ts) ───
export interface ListSectionEntitiesParams {
  readonly sectionSlug: string;
  readonly limit?: number;
  readonly offset?: number;
}

export const CatalogGateway = {
  async listSectionEntities(
    params: ListSectionEntitiesParams,
  ): Promise<CommerceEntity[]> {
    const list = await catalogGateway.listSection({
      slug: params.sectionSlug,
      limit: params.limit,
      offset: params.offset,
    });
    return list.items.map(commerceEntityFromCard);
  },

  async getEntitiesByIds(ids: readonly string[]): Promise<CommerceEntity[]> {
    if (ids.length === 0) return [];
    const cards = await catalogGateway.getManyById(ids);
    return cards.map(commerceEntityFromCard);
  },
};

export type CatalogGatewayType = typeof CatalogGateway;
