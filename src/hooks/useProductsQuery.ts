// TanStack Query layer over the Sovereign Catalog.
// ----------------------------------------------------
// Phase 15.1 — THE SDUI CATALOG CUTOVER.
//
// The legacy `public.products` table is DEAD. This hook now reads
// directly from the Universal Sovereign Catalog:
//
//   salsabil_assets ─┬─ salsabil_skus ─── salsabil_inventory_matrix
//                    └── salsabil_financial_contracts (priced per SKU)
//
// We map the Sovereign rows back to the existing `Product` shape so
// every UI card that consumes `useProductsQuery` keeps working without
// modification. The legacy ID format `usa_<uuid-no-dashes>` is preserved
// — that's the bridge format the cart, order history, and "Buy It Again"
// surfaces all already expect.

import { queryOptions, useQuery } from "@tanstack/react-query";
import {
  fetchCatalogQueryRows,
  fetchCatalogHomeRows,
  type CatalogQueryRow,
} from "@/core/catalog/gateway/SovereignCatalogGateway";
import {
  type Product,
  type ProductSource,
  type ProductVariant,
  type ProductAddon,
} from "@/core/catalog/legacyProduct.types";
import { getWorkspaceIdSync, workspaceQueryKey } from "@/core/identity/workspace";
import { Tracer } from "@/core/system/observability/Tracer";

/**
 * Workspace-scoped catalog cache key. Sourced from the server-attested
 * workspace identity. Exported as a FUNCTION so the key reflects the
 * live hydrated workspace id at call time (a module-load const would
 * freeze in the `<unhydrated>` partition).
 */
export const PRODUCTS_QUERY_KEY = (): ReadonlyArray<unknown> =>
  workspaceQueryKey("catalog", "products");

// Phase 39 — Catalog SWR window: 5 min fresh, 24 h cached on disk.
const STALE_MS = 5 * 60 * 1000;
const GC_MS = 24 * 60 * 60 * 1000;
const isBrowser = typeof window !== "undefined";

const FALLBACK_IMG =
  "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23f3f4f6'/%3E%3C/svg%3E";

const toLegacyId = (assetId: string): string =>
  `usa_${assetId.replace(/-/g, "")}`;

const pickImage = (media: unknown): string => {
  if (Array.isArray(media) && media.length > 0) {
    const first = media[0];
    if (typeof first === "string") return first;
    if (first && typeof first === "object") {
      const rec = first as Record<string, unknown>;
      const url = (rec.url ?? rec.src ?? rec.path) as string | undefined;
      if (url) return url;
    }
  }
  if (media && typeof media === "object") {
    const rec = media as Record<string, unknown>;
    const url = (rec.url ?? rec.src) as string | undefined;
    if (url) return url;
  }
  return FALLBACK_IMG;
};

const sourceFromCategory = (path: string | null): ProductSource => {
  if (!path) return "supermarket";
  const head = path.split("/")[0]?.toLowerCase() ?? "";
  const map: Record<string, ProductSource> = {
    supermarket: "supermarket",
    kitchen: "kitchen",
    dairy: "dairy",
    produce: "produce",
    recipes: "recipes",
    pharmacy: "pharmacy",
    library: "library",
    wholesale: "wholesale",
    home: "home",
    village: "village",
    baskets: "baskets",
    restaurants: "restaurants",
    meat: "meat",
    sweets: "sweets",
  };
  return map[head] ?? "supermarket";
};

type SovereignRow = CatalogQueryRow;

function rowToProduct(row: SovereignRow): Product | null {
  const skus = row.salsabil_skus ?? [];
  // Pick first active SKU (lowest sort_order). If none, skip.
  const ordered = [...skus].sort(
    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
  );
  const primary = ordered.find((s) => s.is_active !== false) ?? ordered[0];
  if (!primary) return null;

  const contract = primary.salsabil_financial_contracts?.[0];
  const price = contract?.base_price != null ? Number(contract.base_price) : 0;

  const traits = row.traits ?? {};
  const oldPriceRaw = (traits as Record<string, unknown>).old_price;
  const oldPrice =
    typeof oldPriceRaw === "number"
      ? oldPriceRaw
      : typeof oldPriceRaw === "string"
        ? Number(oldPriceRaw)
        : undefined;

  const attrs = primary.attributes ?? {};
  const unit =
    (attrs.unit as string | undefined) ??
    (attrs.size as string | undefined) ??
    (traits.unit as string | undefined) ??
    "وحدة";

  const brand = (traits.brand as string | undefined) ?? undefined;
  const badge = (traits.badge as Product["badge"]) ?? undefined;
  const rating =
    typeof traits.rating === "number" ? (traits.rating as number) : undefined;
  const subCategory =
    row.category_path && row.category_path.includes("/")
      ? row.category_path.split("/").slice(1).join("/")
      : undefined;
  const category =
    row.category_path?.split("/")[0] ??
    (traits.category as string | undefined) ??
    "general";

  return {
    id: toLegacyId(row.id),
    name: row.name,
    brand,
    unit,
    price,
    oldPrice: oldPrice && Number.isFinite(oldPrice) ? oldPrice : undefined,
    image: pickImage(row.media),
    rating,
    category,
    subCategory,
    source: sourceFromCategory(row.category_path),
    badge,
    variants: (traits.variants as ProductVariant[] | undefined) ?? undefined,
    addons: (traits.addons as ProductAddon[] | undefined) ?? undefined,
    perishable: (traits.perishable as boolean | undefined) ?? undefined,
    metadata: {
      ...(traits as Record<string, unknown>),
      usa_asset_id: row.id,
      usa_sku_id: primary.id,
    },
    description: row.description ?? undefined,
  };
}

async function fetchAllProducts(): Promise<Product[]> {
  if (!isBrowser) return [];
  const rows = await fetchCatalogQueryRows();
  return rows
    .map((r) => rowToProduct(r as SovereignRow))
    .filter((p): p is Product => p != null);
}

export const productsQueryOptions = () =>
  queryOptions({
    queryKey: PRODUCTS_QUERY_KEY(),
    queryFn: fetchAllProducts,
    staleTime: STALE_MS,
    gcTime: GC_MS,
    enabled: getWorkspaceIdSync() !== null,
  });

/** SWR-cached full Sovereign catalog. */
export function useProductsQuery() {
  return useQuery(productsQueryOptions());
}

/** SWR-cached subset filtered by storefront source. */
export function useProductsBySourceQuery(source: ProductSource) {
  return useQuery({
    ...productsQueryOptions(),
    select: (all) => all.filter((p) => p.source === source),
  });
}

/** SWR-cached single product lookup by id. */
export function useProductQuery(id: string | undefined) {
  return useQuery({
    ...productsQueryOptions(),
    enabled: Boolean(id),
    select: (all) => (id ? all.find((p) => p.id === id) : undefined),
  });
}

/* ── Cold-start fast path (source-aware, capped) ──
 *
 * Wave P-C (Payload Diet) — the home grid uses a MINIMAL select that
 * EXCLUDES the heavy `media` column (which historically inlined multi-MB
 * base64 blobs). We hydrate `image` with the lightweight FALLBACK_IMG
 * placeholder; product detail pages use the full select to fetch real media.
 */
async function fetchHomeProducts(
  limit: number,
  source?: ProductSource,
): Promise<Product[]> {
  const rows = await fetchCatalogHomeRows(limit, source ?? null);
  const mapped = rows
    .map((r) => rowToProduct({ ...(r as SovereignRow), media: null }))
    .filter((p): p is Product => p != null);
  const filtered = source ? mapped.filter((p) => p.source === source) : mapped;
  const sliced = filtered.slice(0, limit);
  if (sliced.length === 0) {
    Tracer.warn("hooks", "cataloggateway_section_returned_0_products_for_slug", { args: ["[CatalogGateway] Section returned 0 products for slug:", source ?? "(all)"] });
  }
  return sliced;
}

export const homeProductsQueryOptions = (limit = 48, source?: ProductSource) =>
  queryOptions({
    queryKey: ["catalog", "home-products", source ?? "all", limit] as const,
    queryFn: () => fetchHomeProducts(limit, source),
    staleTime: STALE_MS,
    gcTime: GC_MS,
  });

export function useHomeProductsQuery(limit = 48, source?: ProductSource) {
  return useQuery(homeProductsQueryOptions(limit, source));
}
