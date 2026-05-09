import { useEffect, useRef } from "react";

/**
 * Phase 44 — Realtime Governance (Visibility-Aware Sockets)
 * ---------------------------------------------------------
 * Wraps a Supabase Realtime subscription so it is automatically torn down
 * when the tab is hidden and re-established (with a catch-up fetch) when it
 * becomes visible again. Drops idle WebSocket pressure on the cluster
 * without losing eventual consistency.
 *
 * Contract:
 *   - `subscribe()` is called only while the tab is visible AND `enabled` is true.
 *     It must return a cleanup function (typically `supabase.removeChannel(ch)`).
 *   - `onResume()` runs once on every hidden→visible transition AFTER resubscribe,
 *     so callers can `queryClient.invalidateQueries()` / refetch missed updates.
 *   - Rapid visibility flips are deduped via a single channel ref to prevent
 *     duplicate channels and memory leaks.
 */
export const useVisibilitySocket = (
  subscribe: () => (() => void) | void,
  onResume?: () => void,
  deps: ReadonlyArray<unknown> = [],
  enabled = true,
): void => {
  const cleanupRef = useRef<(() => void) | null>(null);
  // Stable refs so callbacks don't need to be in the dep list.
  const subscribeRef = useRef(subscribe);
  const onResumeRef = useRef(onResume);
  subscribeRef.current = subscribe;
  onResumeRef.current = onResume;

  useEffect(() => {
    if (!enabled || typeof document === "undefined") return;

    const attach = () => {
      if (cleanupRef.current) return; // already attached — dedupe
      const cleanup = subscribeRef.current();
      cleanupRef.current = typeof cleanup === "function" ? cleanup : null;
    };

    const detach = () => {
      const c = cleanupRef.current;
      cleanupRef.current = null;
      if (c) {
        try {
          c();
        } catch {
          /* ignore */
        }
      }
    };

    const isHidden = () => document.visibilityState === "hidden";

    if (!isHidden()) attach();

    const onVis = () => {
      if (isHidden()) {
        detach();
      } else {
        attach();
        try {
          onResumeRef.current?.();
        } catch {
          /* ignore */
        }
      }
    };

    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      detach();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ...deps]);
};
