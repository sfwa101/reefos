// Catalog domain types + row mapper.
// ----------------------------------------------------
// Phase 22.0 — The legacy in-memory `cache: Product[]`, eager
// `ensureProductsLoaded()`, realtime full-table subscription, and
// visibility/focus/online refetch listeners were DELETED. Catalog data
// now flows exclusively through `useInfiniteCatalog` (paginated, server
// side filtered) per call-site.
//
// What remains here is the pure data contract: types, the DB→domain
// row mapper, and perishability helpers. Nothing here touches global
// state or the network at module scope.

export type ProductVariant = {
  id: string;
  label: string;
  priceDelta: number;
};
export type ProductAddon = {
  id: string;
  label: string;
  price: number;
};

export type ProductSource =
  | "supermarket" | "kitchen" | "dairy" | "produce" | "recipes"
  | "pharmacy" | "library" | "wholesale" | "home"
  | "village" | "baskets" | "restaurants" | "meat" | "sweets";

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
  /** Polymorphic per-source metadata (pharmacy fields, meat prep, etc). */
  metadata?: Record<string, unknown>;
  /** Long-form description (used on PDP). */
  description?: string;
};

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
    metadata: (row.metadata && typeof row.metadata === "object")
      ? (row.metadata as Record<string, unknown>)
      : undefined,
    description: row.description ?? undefined,
  };
}

/* ============ Perishability ============ */
const PERISHABLE_SOURCES: ReadonlyArray<ProductSource> = [
  "produce", "dairy", "meat", "kitchen", "recipes", "restaurants", "baskets",
];

export const isPerishable = (p: Product): boolean => {
  if (typeof p.perishable === "boolean") return p.perishable;
  if (PERISHABLE_SOURCES.includes(p.source)) return true;
  if (p.category === "المجمدات") return true;
  if (p.source === "sweets" && (p.subCategory === "تورتات" || p.subCategory === "مثلجات")) return true;
  return false;
};

export const productAvailableInZone = (
  p: Product,
  zoneAcceptsPerishables: boolean,
): boolean => zoneAcceptsPerishables || !isPerishable(p);
