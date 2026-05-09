/**
 * Phase T-P3 — Salsabil OS Edge cache hydration.
 * Phase 43 — bounded persistence to prevent iOS Safari quota crashes.
 *
 * Persists the React Query cache to IndexedDB (via idb-keyval) so cold
 * boots can paint instantly from disk, then revalidate in the background.
 *
 * Bounds enforced before write:
 *   • MAX_QUERIES                — newest 50 queries kept, rest dropped
 *   • MAX_PAYLOAD_BYTES_PER_QUERY — large payloads dropped (per-query)
 *   • MAX_TOTAL_BYTES            — overall blob ceiling
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
const BUSTER = "salsabil-os-v4-phase43";
const KEY_BASE = "reef.queryCache.v1";
const MAX_AGE = 24 * 60 * 60 * 1000; // 24h — outer TTL; gcTime evicts sooner.

// Phase 43 caps.
const MAX_QUERIES = 50;
const MAX_PAYLOAD_BYTES_PER_QUERY = 256 * 1024; // 256 KB
const MAX_TOTAL_BYTES = 4 * 1024 * 1024;        // 4 MB

const PERSISTABLE_PREFIXES: ReadonlyArray<string> = [
  "catalog",       // useHomeProductsQuery, useProductsQuery
  "categories",    // useFeaturedCategoriesQuery
  "geozones",      // useGeoZones
  "sdui_layouts",  // SDUI block tree (Phase U)
  "ui_layouts",    // section_order / section_config (Phase U)
];

const isPersistableKey = (key: ReadonlyArray<unknown>): boolean => {
  // Phase 41 — query keys may be tenant-prefixed: ["tenant", id, "<prefix>", ...]
  const head = key[0];
  if (typeof head === "string" && PERSISTABLE_PREFIXES.includes(head)) return true;
  if (head === "tenant" && typeof key[2] === "string" && PERSISTABLE_PREFIXES.includes(key[2] as string)) return true;
  return false;
};

/**
 * Trim the dehydrated client blob in-place: drop oversized queries, then
 * keep only the newest MAX_QUERIES, then enforce a total-size ceiling.
 */
function trimDehydratedBlob(raw: string): string {
  try {
    const parsed = JSON.parse(raw) as {
      clientState?: {
        queries?: Array<{
          queryKey: unknown[];
          state?: { dataUpdatedAt?: number };
        }>;
      };
    };
    const queries = parsed?.clientState?.queries;
    if (!Array.isArray(queries)) return raw;

    // 1. Drop queries whose serialized payload exceeds the per-query cap.
    let kept = queries.filter((q) => {
      try {
        const size = JSON.stringify(q).length;
        return size <= MAX_PAYLOAD_BYTES_PER_QUERY;
      } catch {
        return false;
      }
    });

    // 2. Keep only the newest MAX_QUERIES by dataUpdatedAt.
    kept.sort((a, b) => (b.state?.dataUpdatedAt ?? 0) - (a.state?.dataUpdatedAt ?? 0));
    if (kept.length > MAX_QUERIES) kept = kept.slice(0, MAX_QUERIES);

    parsed.clientState!.queries = kept;
    let serialized = JSON.stringify(parsed);

    // 3. If still over the total ceiling, drop oldest until under cap.
    while (serialized.length > MAX_TOTAL_BYTES && kept.length > 0) {
      kept.pop();
      parsed.clientState!.queries = kept;
      serialized = JSON.stringify(parsed);
    }
    return serialized;
  } catch {
    // If anything goes wrong, return original — the persister will still work.
    return raw;
  }
}

export const installEdgePersister = (queryClient: QueryClient): void => {
  if (typeof window === "undefined") return;
  if (typeof indexedDB === "undefined") return;

  // Phase VII-A — namespace by Supabase user id so AI-personalized layouts
  // and per-user catalog slices never leak between accounts on the same
  // device. Resolves the user lazily; until known, persist under "_anon".
  const resolveUserId = async (): Promise<string> => {
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data } = await supabase.auth.getSession();
      return data.session?.user.id ?? "_anon";
    } catch {
      return "_anon";
    }
  };

  void resolveUserId().then((userId) => {
    const KEY = `${KEY_BASE}.${userId}`;

    const persister = createAsyncStoragePersister({
      storage: {
        getItem: (k) => get<string>(k).then((v) => v ?? null),
        setItem: (k, v) => set(k, trimDehydratedBlob(v)),
        removeItem: (k) => del(k),
      },
      key: KEY,
      throttleTime: 1500,
    });

    void persistQueryClient({
      queryClient: queryClient as unknown as Parameters<typeof persistQueryClient>[0]["queryClient"],
      persister,
      maxAge: MAX_AGE,
      buster: `${BUSTER}:${userId}`,
      dehydrateOptions: {
        shouldDehydrateQuery: (q) => {
          if (q.state.status !== "success") return false;
          return isPersistableKey(q.queryKey);
        },
      },
    });
  });
};
