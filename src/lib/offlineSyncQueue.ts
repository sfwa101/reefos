/**
 * Phase 49 — Ground-Sync Engine: Offline Mutation Queue.
 *
 * Local-first, IndexedDB-backed durable queue for operator mutations
 * (Drivers, Cashiers, Admins) so transient network drops never block
 * field operations during the 100-day summer peak.
 *
 * Storage: a single `idb-keyval` key holds a JSON-serializable array of
 * pending items. We accept the read-modify-write cost — the queue is
 * tiny (typically <20 items) and writes are operator-paced, not high
 * throughput. This sidesteps idb-keyval's lack of cursor APIs.
 *
 * Two op shapes are supported:
 *   • { op: "rpc",          rpcName, payload }     → supabase.rpc(name, payload)
 *   • { op: "table.update", table, match, patch }  → supabase.from(table).update(patch).match(match)
 *
 * Both shapes only carry plain JSON — no functions, Dates serialize
 * naturally as ISO strings since callers pass strings already.
 */
import { get, set } from "idb-keyval";
// P0 / V-2 — `supabase` import intentionally removed; replay path is
// disabled until the server-function rewrite (see executeOne TODO).

const QUEUE_KEY = "salsabil.offlineSyncQueue.v1";

export type QueuedRpcOp = {
  op: "rpc";
  rpcName: string;
  payload: Record<string, unknown>;
};

export type QueuedTableUpdateOp = {
  op: "table.update";
  table: string;
  match: Record<string, string | number>;
  patch: Record<string, unknown>;
};

export type QueuedSovereignCheckoutOp = {
  op: "sovereign.checkout";
  payload: {
    customer_id: string;
    cart_items: Array<{ product_id: string; quantity: number }>;
    delivery_info: Record<string, unknown>;
    idempotency_key: string;
    expected_snapshot_hash: string;
    cashier_context?: {
      member_tier?: "guest" | "bronze" | "silver" | "gold" | "vip";
      coupon_code?: string | null;
      delivery_zone_id?: string | null;
      delivery_fee?: number;
      currency?: string;
    };
  };
};

export type QueuedOp = QueuedRpcOp | QueuedTableUpdateOp | QueuedSovereignCheckoutOp;

export type QueuedItem = {
  id: string;
  addedAt: number;
  status: "pending";
  attempts: number;
  lastError?: string;
} & QueuedOp;

const newId = (): string =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `q_${Date.now()}_${Math.random().toString(36).slice(2)}`;

const safeRead = async (): Promise<QueuedItem[]> => {
  try {
    const raw = await get<QueuedItem[]>(QUEUE_KEY);
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
};

const safeWrite = async (items: QueuedItem[]): Promise<void> => {
  try {
    // JSON round-trip guarantees the payload is serializable; corrupt
    // entries (e.g. circular refs) throw here instead of silently
    // poisoning the queue at flush time.
    const sanitized = JSON.parse(JSON.stringify(items)) as QueuedItem[];
    await set(QUEUE_KEY, sanitized);
  } catch {
    /* swallow — disk-full or quota; in-flight UI already updated */
  }
};

export const enqueueOfflineMutation = async (op: QueuedOp): Promise<QueuedItem> => {
  const item: QueuedItem = {
    id: newId(),
    addedAt: Date.now(),
    status: "pending",
    attempts: 0,
    ...op,
  };
  const items = await safeRead();
  items.push(item);
  await safeWrite(items);
  return item;
};

export const peekOfflineQueue = (): Promise<QueuedItem[]> => safeRead();

export const offlineQueueSize = async (): Promise<number> =>
  (await safeRead()).length;

const executeOne = async (item: QueuedItem): Promise<void> => {
  // P0 / V-2 — Offline replay TEMPORARILY DISABLED.
  // The Emperor's directive: while we stabilize the live network path
  // before the first sale, the queue must not silently fire raw
  // `supabase.rpc` / `supabase.from` calls from the client. We accept
  // the trade-off (no offline drain) until the replay path is rewired
  // through server functions.
  //
  // TODO: Re-enable via Server Functions (e.g. replayQueuedOpFn under
  // `requireSupabaseAuth`) so RLS and tracing apply to drained ops.
  void item;
  throw new Error("offline_replay_disabled");
  /*
  if (item.op === "rpc") {
    const rpc = supabase.rpc as unknown as DynamicRpc;
    const { error } = await rpc(item.rpcName, item.payload);
    if (error) throw new Error(error.message);
    return;
  }
  if (item.op === "table.update") {
    const from = supabase.from as unknown as DynamicFrom;
    const { error } = await from(item.table).update(item.patch).match(item.match);
    if (error) throw new Error(error.message);
    return;
  }
  if (item.op === "sovereign.checkout") {
    const { callSovereignCheckout } = await import(
      "@/core/hakim-ai/hooks/useSovereignCheckout"
    );
    await callSovereignCheckout(item.payload);
    return;
  }
  */
};

let processing = false;

/**
 * Drain the queue. Successful items are removed; failures are kept with
 * incremented `attempts` and `lastError`. Concurrent calls coalesce.
 * Returns counts so the caller (toast/badge) can surface progress.
 */
export const processQueue = async (): Promise<{ ok: number; failed: number; remaining: number }> => {
  if (processing) return { ok: 0, failed: 0, remaining: (await safeRead()).length };
  processing = true;
  let ok = 0;
  let failed = 0;
  try {
    let items = await safeRead();
    if (items.length === 0) return { ok: 0, failed: 0, remaining: 0 };

    const survivors: QueuedItem[] = [];
    for (const item of items) {
      try {
        await executeOne(item);
        ok += 1;
      } catch (e) {
        failed += 1;
        survivors.push({
          ...item,
          attempts: item.attempts + 1,
          lastError: e instanceof Error ? e.message : String(e),
        });
      }
    }
    items = survivors;
    await safeWrite(items);
    return { ok, failed, remaining: items.length };
  } finally {
    processing = false;
  }
};

/**
 * Network failure heuristic. Supabase wraps fetch errors as
 * `TypeError: Failed to fetch` (Chromium) or `NetworkError` (Firefox),
 * and surfaces no `error.code`. We also defer to navigator.onLine.
 */
export const isLikelyNetworkError = (err: unknown): boolean => {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return true;
  if (!err) return false;
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  return (
    msg.includes("failed to fetch") ||
    msg.includes("networkerror") ||
    msg.includes("network request failed") ||
    msg.includes("load failed") ||
    msg.includes("fetch failed")
  );
};
