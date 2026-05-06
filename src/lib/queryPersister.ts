/**
 * Phase T-P3 — Salsabil OS Edge cache hydration.
 *
 * Persists the React Query cache to IndexedDB (via idb-keyval) so cold
 * boots can paint instantly from disk, then revalidate in the background.
 *
 * Only the catalog-shaped queries are persisted — auth/session-bound data
 * is intentionally excluded so we never serve another user's slice from
 * disk after a logout/login on the same device.
 */
import { get, set, del } from "idb-keyval";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { persistQueryClient } from "@tanstack/react-query-persist-client";
import type { QueryClient } from "@tanstack/react-query";

// Bump this whenever the persisted shape changes (rowToProduct, etc.)
// to invalidate stale snapshots on every device.
const BUSTER = "reef-edge-v1";
const KEY = "reef.queryCache.v1";
const MAX_AGE = 24 * 60 * 60 * 1000; // 24h

const PERSISTABLE_PREFIXES: ReadonlyArray<string> = [
  "catalog",       // useHomeProductsQuery, useProductsQuery
  "categories",    // useFeaturedCategoriesQuery
  "geozones",      // useGeoZones
  "sdui_layouts",  // SDUI block tree (Phase U)
  "ui_layouts",    // section_order / section_config (Phase U)
];

const isPersistableKey = (key: ReadonlyArray<unknown>): boolean => {
  const head = key[0];
  return typeof head === "string" && PERSISTABLE_PREFIXES.includes(head);
};

export const installEdgePersister = (queryClient: QueryClient): void => {
  if (typeof window === "undefined") return;
  if (typeof indexedDB === "undefined") return;

  const persister = createAsyncStoragePersister({
    storage: {
      getItem: (k) => get<string>(k).then((v) => v ?? null),
      setItem: (k, v) => set(k, v),
      removeItem: (k) => del(k),
    },
    key: KEY,
    throttleTime: 1500,
  });

  void persistQueryClient({
    // Cast around dual @tanstack/query-core copies in node_modules.
    queryClient: queryClient as unknown as Parameters<typeof persistQueryClient>[0]["queryClient"],
    persister,
    maxAge: MAX_AGE,
    buster: BUSTER,
    dehydrateOptions: {
      shouldDehydrateQuery: (q) => {
        if (q.state.status !== "success") return false;
        return isPersistableKey(q.queryKey);
      },
    },
  });
};
