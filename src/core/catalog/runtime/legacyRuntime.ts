/**
 * Legacy `@/lib/products` runtime — Wave P-B (Static Catalog Killer) bridge.
 *
 * This module hosts the **runtime** half of the deprecated `@/lib/products`
 * surface (the proxy `products`, `getById`, `bySource`, the QueryClient
 * binding, and the bootstrap helpers). The legacy file `src/lib/products.ts`
 * now re-exports from here, so the 8 §2.E external consumers keep compiling
 * unchanged. Migrated leaves (B-3, B-7, B-8, B-9) import directly from this
 * module → C2 strictly decreases without runtime breakage.
 *
 * @deprecated Wave P-B. Scheduled for vaporization in Step B-10 alongside
 * `src/lib/products.ts`. Do NOT add new consumers. Use `catalogGateway`,
 * `useCartHydration`, `useProductsQuery`, or `searchRegistry` instead.
 *
 * ─── Transient self-binding shim ────────────────────────────────────────
 * Step B-6 deleted `<CatalogBootstrap />`, which means `bindCatalogSource()`
 * is no longer invoked from the React tree. Without this shim, `snapshot()`
 * would return `[]` for every legacy consumer. The shim:
 *   1. On first empty-snapshot read in the browser, fires a one-shot
 *      background fetch via the same query function used by
 *      `productsQueryOptions()`.
 *   2. Caches the result in a module-local array so subsequent synchronous
 *      reads are populated without depending on a `QueryClient`.
 *   3. Pushes the data into the bound `QueryClient` (when one binds later)
 *      so TanStack consumers stay aligned.
 *
 * The shim is intentionally eventual-consistent: the very first render that
 * triggers it sees `[]`, and any subsequent render after the fetch resolves
 * sees the populated catalog. This is acceptable because every consumer
 * still on this surface is on the demolition list for Steps B-8 / B-9, and
 * the whole module disappears in B-10.
 */

import type { QueryClient } from "@tanstack/react-query";

import type {
  Product,
  ProductSource,
} from "../legacyProduct.types";

// PRODUCTS_QUERY_KEY now lives in `@/hooks/useProductsQuery` (Step B-5).
// Re-exported here so existing callers keep compiling.
export { PRODUCTS_QUERY_KEY } from "@/hooks/useProductsQuery";
import { PRODUCTS_QUERY_KEY } from "@/hooks/useProductsQuery";
import { Tracer } from "@/core/system/observability/Tracer";

let boundClient: QueryClient | null = null;
const extraProducts: Product[] = [];

/* ─── Transient self-binding shim state ─────────────────────────────── */
let selfBoundCache: Product[] = [];
let selfBindInFlight = false;
let selfBindAttempted = false;

function triggerSelfBind(): void {
  if (selfBindAttempted || selfBindInFlight) return;
  if (typeof window === "undefined") return; // SSR-safe
  selfBindInFlight = true;
  // Dynamic import to break the cycle: useProductsQuery imports legacy types
  // from this folder, and we lazy-load only when actually needed.
  void import("@/hooks/useProductsQuery")
    .then(async ({ productsQueryOptions }) => {
      try {
        const result = await productsQueryOptions().queryFn!({
          // The queryFn does not actually consume these args — they are
          // here only to satisfy TanStack's QueryFunctionContext shape.
          queryKey: PRODUCTS_QUERY_KEY(),
          signal: new AbortController().signal,
          meta: undefined,
          client: boundClient as unknown as QueryClient,
        } as never);
        const arr = (result as Product[]) ?? [];
        if (arr.length > 0) {
          selfBoundCache = arr;
          if (boundClient) {
            try {
              boundClient.setQueryData<Product[]>(PRODUCTS_QUERY_KEY(), arr);
            } catch {
              /* swallow — shim is best-effort */
            }
          }
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        Tracer.warn("catalog", "legacyruntime_self_bind_fetch_failed", { args: ["[legacyRuntime] self-bind fetch failed:", err] });
      } finally {
        selfBindInFlight = false;
        selfBindAttempted = true;
      }
    })
    .catch(() => {
      selfBindInFlight = false;
      selfBindAttempted = true;
    });
}

/**
 * @deprecated Wave P-B — was called from `<CatalogBootstrap />`. Now a no-op
 * for new code; still exposed so the legacy bootstrap path stays type-safe.
 */
export function bindCatalogSource(client: QueryClient): void {
  boundClient = client;
  // If the self-bind already ran, push its data into the freshly-bound client.
  if (selfBoundCache.length > 0) {
    try {
      client.setQueryData<Product[]>(PRODUCTS_QUERY_KEY(), selfBoundCache);
    } catch {
      /* ignore */
    }
  }
}

function snapshot(): Product[] {
  const fromQuery =
    boundClient?.getQueryData<Product[]>(PRODUCTS_QUERY_KEY()) ?? [];
  const base = fromQuery.length > 0 ? fromQuery : selfBoundCache;
  if (base.length === 0) {
    // Fire-and-forget — populates `selfBoundCache` for the next render.
    triggerSelfBind();
  }
  return extraProducts.length ? [...base, ...extraProducts] : base;
}

/**
 * @deprecated Wave P-B — live proxy that mirrors the in-memory catalog.
 * Replaced by `catalogGateway.listSection(...)` for new code.
 */
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

/** @deprecated Wave P-B — use `catalogGateway.getDetailsById(id)`. */
export const getById = (id: string): Product | undefined => {
  const arr = snapshot();
  return arr.find((p) => p.id === id);
};

/** @deprecated Wave P-B — use `catalogGateway.listSection({ slug })`. */
export const bySource = (source: ProductSource): Product[] =>
  snapshot().filter((p) => p.source === source);

/** @deprecated Wave P-B — vendor-extension hook; no longer recommended. */
export const registerProducts = (items: Product[]): void => {
  for (const item of items) {
    if (
      !extraProducts.some((p) => p.id === item.id) &&
      !snapshot().some((p) => p.id === item.id)
    ) {
      extraProducts.push(item);
    }
  }
};

/** @deprecated Wave P-B — use `catalogGateway` per-section hydration. */
export async function ensureProductsLoaded(): Promise<Product[]> {
  if (boundClient) {
    const { productsQueryOptions } = await import("@/hooks/useProductsQuery");
    return boundClient.ensureQueryData(productsQueryOptions());
  }
  // No client bound yet — fall back to the self-bind shim.
  if (selfBoundCache.length === 0 && !selfBindAttempted) {
    triggerSelfBind();
  }
  return selfBoundCache.slice();
}

/** @deprecated Wave P-B — invalidation is owned by the gateway/cache. */
export async function refetchProducts(): Promise<void> {
  if (!boundClient) return;
  await boundClient.invalidateQueries({ queryKey: PRODUCTS_QUERY_KEY() });
}
