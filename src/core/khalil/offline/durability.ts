/**
 * Khalil — offline durability helpers (P2.8).
 *
 * Augments the existing `khalilOfflineQueue` without changing its public
 * contract. Adds:
 *   - schema versioning constant
 *   - max queue size enforcement
 *   - exponential backoff scheduler
 *   - orphaned-intent cleanup policy
 *   - diagnostic snapshot
 *
 * Pure functions only — no IndexedDB access here. The queue singleton
 * consumes these helpers; tests exercise them in isolation.
 */
import type { KhalilQueuedIntent } from "../offlineQueue";

export const KHALIL_QUEUE_SCHEMA_VERSION = 1;
export const KHALIL_QUEUE_MAX_SIZE = 500;
export const KHALIL_QUEUE_ORPHAN_TTL_MS = 1000 * 60 * 60 * 24 * 14; // 14 days

/**
 * Exponential backoff with jitter, capped at 5 minutes.
 * attempt 0 -> ~1s, 1 -> ~2s, 2 -> ~4s, ..., max 300s.
 */
export function backoffMs(attempt: number, now: number = Date.now()): number {
  const base = Math.min(300_000, 1000 * 2 ** Math.min(attempt, 8));
  // deterministic-ish jitter from now() bits (no Math.random for testability)
  const jitter = (now & 0xff) * 4;
  return base + jitter;
}

/** Enforces FIFO + max-size by dropping the OLDEST intents first. */
export function enforceMaxSize<T extends KhalilQueuedIntent>(
  buf: readonly T[],
  max: number = KHALIL_QUEUE_MAX_SIZE,
): { kept: T[]; dropped: T[] } {
  if (buf.length <= max) return { kept: [...buf], dropped: [] };
  const overflow = buf.length - max;
  return { dropped: buf.slice(0, overflow), kept: buf.slice(overflow) };
}

/** Removes intents older than the orphan TTL. */
export function pruneOrphans<T extends KhalilQueuedIntent>(
  buf: readonly T[],
  now: number = Date.now(),
  ttl: number = KHALIL_QUEUE_ORPHAN_TTL_MS,
): { kept: T[]; pruned: T[] } {
  const kept: T[] = [];
  const pruned: T[] = [];
  for (const i of buf) (now - i.createdAt > ttl ? pruned : kept).push(i);
  return { kept, pruned };
}

export interface OfflineDiagnostics {
  schemaVersion: number;
  size: number;
  oldestAgeMs: number | null;
  capabilities: Record<string, number>;
}

export function diagnose<T extends KhalilQueuedIntent>(
  buf: readonly T[],
  now: number = Date.now(),
): OfflineDiagnostics {
  const capabilities: Record<string, number> = {};
  let oldest: number | null = null;
  for (const i of buf) {
    capabilities[i.capability] = (capabilities[i.capability] ?? 0) + 1;
    if (oldest === null || i.createdAt < oldest) oldest = i.createdAt;
  }
  return {
    schemaVersion: KHALIL_QUEUE_SCHEMA_VERSION,
    size: buf.length,
    oldestAgeMs: oldest === null ? null : now - oldest,
    capabilities,
  };
}
