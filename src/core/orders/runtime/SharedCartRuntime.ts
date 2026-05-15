/**
 * Salsabil OS — Phase P-1.1.C · Sovereign Shared-Cart Slice.
 *
 * Layer 4 (Domain). Single source of truth for the active shared-cart id.
 *
 * Replaces the legacy `SharedCartContext` Provider. Storage policy and
 * cross-tab sync are encoded once, here, with no React provider — UI
 * subscribes via {@link useSharedCart} (built on `useSyncExternalStore`).
 *
 * Constitutional notes:
 *   • Kernel-pure: no Supabase, no fetch, no React renders inside the runtime.
 *   • Cross-tab sync via the native `storage` event.
 *   • Idempotent setter — ignores no-op writes to keep listener fan-out cheap.
 */

import { useSyncExternalStore } from "react";

const STORAGE_KEY = "reef.activeSharedCartId";

type Listener = () => void;

class SharedCartRuntime {
  private value: string | null = null;
  private readonly listeners = new Set<Listener>();
  private hydrated = false;
  private storageBound = false;

  /** Lazy hydrate from `localStorage` on first observation. */
  private hydrate(): void {
    if (this.hydrated) return;
    this.hydrated = true;
    if (typeof window === "undefined") return;
    try {
      this.value = window.localStorage.getItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    if (!this.storageBound && typeof window !== "undefined") {
      this.storageBound = true;
      window.addEventListener("storage", (e: StorageEvent) => {
        if (e.key !== STORAGE_KEY) return;
        const next = e.newValue;
        if (next === this.value) return;
        this.value = next;
        this.emit();
      });
    }
  }

  private emit(): void {
    for (const l of this.listeners) l();
  }

  get(): string | null {
    this.hydrate();
    return this.value;
  }

  set(id: string | null): void {
    this.hydrate();
    if (id === this.value) return;
    this.value = id;
    if (typeof window !== "undefined") {
      try {
        if (id) window.localStorage.setItem(STORAGE_KEY, id);
        else window.localStorage.removeItem(STORAGE_KEY);
      } catch {
        /* ignore */
      }
    }
    this.emit();
  }

  subscribe(listener: Listener): () => void {
    this.hydrate();
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}

export const sharedCartRuntime = new SharedCartRuntime();

const subscribe = (l: Listener): (() => void) => sharedCartRuntime.subscribe(l);
const getSnapshot = (): string | null => sharedCartRuntime.get();
const getServerSnapshot = (): string | null => null;

export interface UseSharedCartReturn {
  readonly sharedCartId: string | null;
  readonly setSharedCartId: (id: string | null) => void;
}

export function useSharedCart(): UseSharedCartReturn {
  const sharedCartId = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return {
    sharedCartId,
    setSharedCartId: (id: string | null) => sharedCartRuntime.set(id),
  };
}
