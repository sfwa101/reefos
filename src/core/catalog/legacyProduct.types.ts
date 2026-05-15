/**
 * Legacy `Product` shape — Wave P-B (Static Catalog Killer) transitional home.
 *
 * This module hosts the canonical *type* definitions for the legacy denormalized
 * `Product` view-model, plus the small pure predicates (`isPerishable`,
 * `productAvailableInZone`) that several cart-domain files still depend on
 * during the Wave P-B refactor.
 *
 * Why it exists:
 *   - Wave P-B Step B-3 requires the 12 in-scope cart files to drop their
 *     `@/lib/products` imports while the deprecated `product: Product` bridge
 *     on `CartLine` must remain typeable for the 8 §2.E external consumers
 *     that still read `l.product.*`.
 *   - The legacy file `src/lib/products.ts` re-exports from here, so existing
 *     callers continue to compile unchanged. Migrated files import directly
 *     from this module → C2 strictly decreases.
 *
 * Article 3 / Article 11 disposition:
 *   - These types are **deprecated**. New code MUST consume `ProductCardVM`
 *     / `ProductDetailsVM` from `@/core/catalog/types`.
 *   - The whole module is scheduled for deletion alongside `src/lib/products.ts`
 *     in Wave P-B Step B-10.
 */

/* ============ Types ============ */

/** @deprecated Wave P-B — use `ProductVariantVM` from `@/core/catalog/types`. */
export type ProductVariant = { id: string; label: string; priceDelta: number };

/** @deprecated Wave P-B — use `ProductAddonVM` from `@/core/catalog/types`. */
export type ProductAddon = { id: string; label: string; price: number };

/**
 * Wave P-9 — Catalog × Packaging integration.
 * Lightweight UI-facing projection of a `salsabil_packaging_tiers` row.
 * Resolved by `SovereignCatalogGateway.buildPackagingOptions`. Backward
 * compatible: assets without tiers expose `packagingTiers: []`, so all
 * existing UI code that reads `Product.price` / `Product.unit` keeps working.
 */
export type PackagingOptionVM = {
  tier_id: string;
  parent_tier_id: string | null;
  label: string;
  uom_code: string | null;
  conversion_to_parent: number;
  conversion_to_base: number;
  unit_price: number;
  price_source: "tier_override" | "sku_base" | "none";
  barcode: string | null;
  is_default_sell: boolean;
  is_stock_keeping: boolean;
  sort_order: number;
};

/** @deprecated Wave P-B — section identity now flows through `SectionIdentityRegistry`. */
export type ProductSource =
  | "supermarket" | "kitchen" | "dairy" | "produce" | "recipes"
  | "pharmacy" | "library" | "wholesale" | "home"
  | "village" | "baskets" | "restaurants" | "meat" | "sweets";

/**
 * @deprecated Wave P-B — legacy denormalized product shape.
 * Replacement: `ProductCardVM` (lists/cards) or `ProductDetailsVM` (PDP) from
 * `@/core/catalog/types`. This shape persists only as the transitional bridge
 * field on `CartLine` until §2.E external consumers are migrated.
 */
export type Product = {
  id: string;
  name: string;
  brand?: string;
  unit: string;
  price: number;
  oldPrice?: number;
  image: string;
  rating?: number;
  category: string;
  subCategory?: string;
  source: ProductSource;
  badge?: "best" | "trending" | "premium" | "new";
  variants?: ProductVariant[];
  addons?: ProductAddon[];
  perishable?: boolean;
  metadata?: Record<string, unknown>;
  description?: string;
  /** Phase 54 — Inventory Triage projections. */
  stock?: number;
  wakalahEligible?: boolean;
  hideOnZero?: boolean;
  lowStockThreshold?: number;
  /** Wave P-9 — packaging tier projection (empty array if asset has no tiers). */
  packagingTiers?: PackagingOptionVM[];
  defaultTierId?: string | null;
};

/** @deprecated Wave P-B — sanctioned only inside `src/core/catalog/**`. */
export type DbRow = {
  id: string; name: string; brand: string | null; unit: string;
  price: number; old_price: number | null;
  image: string | null; image_url: string | null;
  rating: number | null; category: string; sub_category: string | null;
  source: string; badge: string | null;
  variants: unknown; addons: unknown;
  perishable: boolean | null; is_active: boolean;
  metadata: unknown; description: string | null;
};

/* ============ Pure predicates ============ */

const PERISHABLE_SOURCES: ReadonlyArray<ProductSource> = [
  "produce", "dairy", "meat", "kitchen", "recipes", "restaurants", "baskets",
];

/**
 * @deprecated Wave P-B — replace with `ProductCardVM.capabilities.includes("perishable")`
 * once the capability resolver is wired into all cart leaves.
 */
export const isPerishable = (p: Product): boolean => {
  if (typeof p.perishable === "boolean") return p.perishable;
  if (PERISHABLE_SOURCES.includes(p.source)) return true;
  if (p.category === "المجمدات") return true;
  if (p.source === "sweets" && (p.subCategory === "تورتات" || p.subCategory === "مثلجات")) return true;
  return false;
};

/** @deprecated Wave P-B — fold into zone capability check. */
export const productAvailableInZone = (
  p: Product,
  zoneAcceptsPerishables: boolean,
): boolean => zoneAcceptsPerishables || !isPerishable(p);
