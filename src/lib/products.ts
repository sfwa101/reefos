// Catalog domain types + thin React-Query-backed compat layer.
// ----------------------------------------------------
// Phase 26.2 — The legacy in-memory `cache[]` monolith is dead.
//
// `products`, `getById`, `bySource` are now LIVE PROXIES that read
// from the TanStack Query cache (`["catalog","products"]`). The real
// fetch + SWR + realtime invalidation is owned by `useProductsQuery`.
//
// `bindCatalogSource()` is called once from `<CatalogBootstrap />`
// inside the QueryClientProvider, wiring this module to the per-request
// QueryClient (SSR-safe).
//
// Survivors are kept ONLY as a compatibility shim for ~17 legacy
// synchronous consumers — they no longer hold their own state.

import type { QueryClient } from "@tanstack/react-query";

export type ProductVariant = { id: string; label: string; priceDelta: number };
export type ProductAddon = { id: string; label: string; price: number };

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
  metadata?: Record<string, unknown>;
  description?: string;
  /** Phase 54 — Inventory Triage projections (from salsabil_skus.attributes + inventory_matrix). */
  stock?: number;
  wakalahEligible?: boolean;
  hideOnZero?: boolean;
  lowStockThreshold?: number;
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

/* ============ React Query Bridge ============
 * The real catalog lives in the per-request QueryClient under the
 * key `["catalog","products"]`, owned by `useProductsQuery`. This
 * module just reads from it. */

// Phase 41 — Tenant Isolation: every cache entry is partitioned by the
// active tenant so the persisted IndexedDB store can never bleed across
// workspaces. `getActiveTenantId()` is sync-resolved from env/hostname.
import { getActiveTenantId } from "@/context/TenantContext";
export const PRODUCTS_QUERY_KEY = ["tenant", getActiveTenantId(), "catalog", "products"] as const;

let boundClient: QueryClient | null = null;
const extraProducts: Product[] = [];

/** Called once by <CatalogBootstrap/> inside <QueryClientProvider>. */
export function bindCatalogSource(client: QueryClient): void {
  boundClient = client;
}

function snapshot(): Product[] {
  if (!boundClient) return extraProducts.length ? extraProducts.slice() : [];
  const cached = boundClient.getQueryData<Product[]>(PRODUCTS_QUERY_KEY) ?? [];
  return extraProducts.length ? [...cached, ...extraProducts] : cached;
}

/** Live proxy — every read forwards to the current Query cache snapshot.
 *  Preserves `.length`, `.filter`, `.map`, iteration, indexed access. */
export const products: Product[] = new Proxy([] as Product[], {
  get(_t, prop, _recv) {
    const arr = snapshot();
    const value = Reflect.get(arr, prop, arr);
    return typeof value === "function" ? value.bind(arr) : value;
  },
  has(_t, prop) {
    return Reflect.has(snapshot(), prop);
  },
  ownKeys() {
    return Reflect.ownKeys(snapshot());
  },
  getOwnPropertyDescriptor(_t, prop) {
    return Reflect.getOwnPropertyDescriptor(snapshot(), prop);
  },
}) as Product[];

export const getById = (id: string): Product | undefined => {
  const arr = snapshot();
  return arr.find((p) => p.id === id);
};

export const bySource = (source: ProductSource): Product[] =>
  snapshot().filter((p) => p.source === source);

export const registerProducts = (items: Product[]): void => {
  for (const item of items) {
    if (!extraProducts.some((p) => p.id === item.id) && !snapshot().some((p) => p.id === item.id)) {
      extraProducts.push(item);
    }
  }
};

/** Triggers (or returns) the cached fetch via the bound QueryClient. */
export async function ensureProductsLoaded(): Promise<Product[]> {
  if (!boundClient) return [];
  const { productsQueryOptions } = await import("@/hooks/useProductsQuery");
  const data = await boundClient.ensureQueryData(productsQueryOptions());
  return data;
}

export async function refetchProducts(): Promise<void> {
  if (!boundClient) return;
  await boundClient.invalidateQueries({ queryKey: PRODUCTS_QUERY_KEY });
}
