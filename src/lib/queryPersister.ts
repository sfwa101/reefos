/**
 * IndexedDB-backed TanStack Query persister.
 *
 * Wraps `idb-keyval` so that the entire React Query cache survives
 * navigations, refreshes, and offline sessions. Components that read
 * with `useQuery` / `useInfiniteQuery` get an instant first paint
 * from disk, then revalidate in the background once online.
 *
 * Browser-only: do not import from server-only modules.
 */
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { get, set, del } from "idb-keyval";

const IDB_KEY_PREFIX = "reef-query-cache:";

const idbStorage = {
  getItem: async (key: string): Promise<string | null> => {
    const v = await get<string>(IDB_KEY_PREFIX + key);
    return v ?? null;
  },
  setItem: async (key: string, value: string): Promise<void> => {
    await set(IDB_KEY_PREFIX + key, value);
  },
  removeItem: async (key: string): Promise<void> => {
    await del(IDB_KEY_PREFIX + key);
  },
};

export const queryPersister = createAsyncStoragePersister({
  storage: idbStorage,
  key: "reef-react-query",
  // Throttle disk writes so rapid query updates don't thrash IndexedDB.
  throttleTime: 1_000,
});

/** Cache version — bump to invalidate persisted caches across deploys. */
export const PERSIST_BUSTER = "v1";

/** 7 days — long enough for true offline-first, short enough to drift-correct. */
export const PERSIST_MAX_AGE = 7 * 24 * 60 * 60 * 1000;
