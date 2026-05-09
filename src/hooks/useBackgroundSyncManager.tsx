/**
 * Phase 49 — Ground-Sync Engine: Background Sync Manager.
 *
 * Mounted once at the root. Listens for the browser `online` event and
 * for tab-visibility transitions to drain the offline mutation queue
 * via `processQueue()`. Also runs once on mount in case the tab boots
 * already-online with leftover items from a previous session crash.
 *
 * Silent by default — only emits a toast when items actually flush, so
 * idle sessions never see noise.
 */
import { useEffect } from "react";
import { toast } from "sonner";
import { processQueue, offlineQueueSize } from "@/lib/offlineSyncQueue";

const drain = async (reason: string): Promise<void> => {
  const pending = await offlineQueueSize();
  if (pending === 0) return;
  const { ok, failed, remaining } = await processQueue();
  if (ok > 0) {
    toast.success(
      remaining > 0
        ? `تمت مزامنة ${ok} عملية، تبقى ${remaining}`
        : `تمت مزامنة ${ok} عملية بنجاح`,
      { id: `gs-sync-${reason}` },
    );
  }
  if (failed > 0 && ok === 0) {
    // Quietly leave items pending; next online/visibility flip retries.
  }
};

export const useBackgroundSyncManager = (): void => {
  useEffect(() => {
    if (typeof window === "undefined") return;

    let cancelled = false;
    const onOnline = () => {
      if (!cancelled) void drain("online");
    };
    const onVisible = () => {
      if (!cancelled && document.visibilityState === "visible" && navigator.onLine) {
        void drain("visible");
      }
    };

    // Boot drain — handles items left over from a prior crashed session.
    if (navigator.onLine) void drain("boot");

    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
};

/** Mountable component form for use inside the root provider tree. */
export function BackgroundSyncManager() {
  useBackgroundSyncManager();
  return null;
}
