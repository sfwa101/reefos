/**
 * Khalil — offline write-queue (P2.2: IndexedDB-backed).
 *
 * Per p1-offline-pwa.md: reads are best-effort offline; writes are
 * queued and replayed when connectivity returns. The PUBLIC CONTRACT
 * (the class shape, exported singleton, and method signatures) is
 * unchanged from P2.1 — internals only.
 *
 * Storage: `idb-keyval` against a single key holding a JSON-serializable
 * array. Same pattern as `src/lib/offlineSyncQueue.ts`; tiny queues, no
 * cursor traffic. Falls back to in-memory if IndexedDB is unavailable
 * (SSR, private mode, locked-down browsers) so the contract holds.
 *
 * Client-only. Do not import from server fns.
 */
import { get, set } from "idb-keyval";
import type { KhalilCapabilityKey } from "./capabilities";

export interface KhalilQueuedIntent<TPayload = unknown> {
  id: string;
  capability: KhalilCapabilityKey;
  payload: TPayload;
  /** Unix ms when the intent was created on the client. */
  createdAt: number;
  /** Idempotency token — server dedupes on this. */
  idempotencyKey: string;
}

type Listener = (size: number) => void;

const STORAGE_KEY = "khalil.offlineQueue.v1";

const idbAvailable = (): boolean => {
  if (typeof window === "undefined") return false;
  try {
    return typeof indexedDB !== "undefined";
  } catch {
    return false;
  }
};

class KhalilOfflineQueue {
  private buf: KhalilQueuedIntent[] = [];
  private listeners = new Set<Listener>();
  private hydrated = false;
  private hydrating: Promise<void> | null = null;

  constructor() {
    if (idbAvailable()) {
      // Fire-and-forget hydrate; consumers can `await ready()` if they
      // need a guarantee before peeking.
      void this.hydrate();
    } else {
      this.hydrated = true;
    }
  }

  private async hydrate(): Promise<void> {
    if (this.hydrated) return;
    if (this.hydrating) return this.hydrating;
    this.hydrating = (async () => {
      try {
        const raw = await get<KhalilQueuedIntent[]>(STORAGE_KEY);
        if (Array.isArray(raw)) this.buf = raw;
      } catch {
        /* corrupt blob — start clean */
      } finally {
        this.hydrated = true;
        this.emit();
      }
    })();
    return this.hydrating;
  }

  /** Optional awaitable hydration handle for consumers that need it. */
  ready(): Promise<void> {
    return this.hydrate();
  }

  private persist(): void {
    if (!idbAvailable()) return;
    // JSON round-trip guards against accidental non-serializable refs.
    try {
      const snapshot = JSON.parse(JSON.stringify(this.buf)) as KhalilQueuedIntent[];
      void set(STORAGE_KEY, snapshot);
    } catch {
      /* quota or serialization failure — in-memory state still valid */
    }
  }

  enqueue<T>(intent: Omit<KhalilQueuedIntent<T>, "id" | "createdAt">): KhalilQueuedIntent<T> {
    const full: KhalilQueuedIntent<T> = {
      ...intent,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
    };
    this.buf.push(full as KhalilQueuedIntent);
    this.persist();
    this.emit();
    return full;
  }

  peek(): readonly KhalilQueuedIntent[] {
    return this.buf;
  }

  size(): number {
    return this.buf.length;
  }

  drop(id: string): void {
    const before = this.buf.length;
    this.buf = this.buf.filter((i) => i.id !== id);
    if (this.buf.length !== before) {
      this.persist();
      this.emit();
    }
  }

  clear(): void {
    if (this.buf.length === 0) return;
    this.buf = [];
    this.persist();
    this.emit();
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit() {
    for (const l of this.listeners) l(this.buf.length);
  }
}

export const khalilOfflineQueue = new KhalilOfflineQueue();
