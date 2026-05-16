/**
 * Khalil — offline write-queue foundation (P2.1).
 *
 * Per p1-offline-pwa.md: reads are best-effort offline; writes are queued
 * and replayed when connectivity returns. The full IndexedDB-backed queue
 * lands with the first real capability in P2.2; this module establishes
 * the contract so call-sites don't change later.
 *
 * Client-only. Do not import from server fns.
 */
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

class KhalilOfflineQueue {
  private buf: KhalilQueuedIntent[] = [];
  private listeners = new Set<Listener>();

  enqueue<T>(intent: Omit<KhalilQueuedIntent<T>, "id" | "createdAt">): KhalilQueuedIntent<T> {
    const full: KhalilQueuedIntent<T> = {
      ...intent,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
    };
    this.buf.push(full as KhalilQueuedIntent);
    this.emit();
    return full;
  }

  peek(): readonly KhalilQueuedIntent[] {
    return this.buf;
  }

  size(): number {
    return this.buf.length;
  }

  /** Drop intent by id (e.g. after successful flush). */
  drop(id: string): void {
    const before = this.buf.length;
    this.buf = this.buf.filter((i) => i.id !== id);
    if (this.buf.length !== before) this.emit();
  }

  clear(): void {
    if (this.buf.length === 0) return;
    this.buf = [];
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
