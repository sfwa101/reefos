/**
 * Legacy `@/lib/products` shim — Wave P-B (Static Catalog Killer).
 *
 * @deprecated Wave P-B — every export here is forwarded from
 * `@/core/catalog/legacy/legacyProduct.types` (types) and
 * `@/core/catalog/legacy/legacyRuntime` (runtime + transient self-binding
 * shim). Scheduled for **deletion in Step B-10**. Do NOT add new exports
 * or new consumers. Migrated leaves import directly from `@/core/catalog/**`
 * so this file's importer count (C2) strictly decreases each step.
 *
 * Survivors (8 files as of Step B-7) keep compiling against this shim
 * during the staged migration.
 */

// ─── Types ───────────────────────────────────────────────────────────────
export type {
  Product,
  ProductVariant,
  ProductAddon,
  ProductSource,
  DbRow,
} from "@/core/catalog/legacy/legacyProduct.types";
export {
  isPerishable,
  productAvailableInZone,
} from "@/core/catalog/legacy/legacyProduct.types";

// ─── Runtime proxy + bootstrap (now hosted in legacyRuntime) ─────────────
export {
  products,
  getById,
  bySource,
  bindCatalogSource,
  registerProducts,
  ensureProductsLoaded,
  refetchProducts,
  PRODUCTS_QUERY_KEY,
} from "@/core/catalog/legacy/legacyRuntime";

// ─── DB-row mapper (still consumed inside `core/catalog/**`) ─────────────
import type {
  DbRow,
  Product,
  ProductSource,
  ProductVariant,
  ProductAddon,
} from "@/core/catalog/legacy/legacyProduct.types";

export const PRODUCT_COLUMNS =
  "id,name,brand,unit,price,old_price,image,image_url,rating,category,sub_category,source,badge,variants,addons,perishable,is_active,metadata,description" as const;

const FALLBACK_IMG =
  "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23f3f4f6'/%3E%3C/svg%3E";

export function rowToProduct(row: DbRow): Product {
  return {
    id: row.id,
    name: row.name,
    brand: row.brand ?? undefined,
    unit: row.unit,
    price: Number(row.price),
    oldPrice: row.old_price != null ? Number(row.old_price) : undefined,
    image: row.image_url || row.image || FALLBACK_IMG,
    rating: row.rating != null ? Number(row.rating) : undefined,
    category: row.category,
    subCategory: row.sub_category ?? undefined,
    source: (row.source as ProductSource) ?? "supermarket",
    badge: (row.badge as Product["badge"]) ?? undefined,
    variants: (row.variants as ProductVariant[] | null) ?? undefined,
    addons: (row.addons as ProductAddon[] | null) ?? undefined,
    perishable: row.perishable ?? undefined,
    metadata:
      row.metadata && typeof row.metadata === "object"
        ? (row.metadata as Record<string, unknown>)
        : undefined,
    description: row.description ?? undefined,
  };
}
