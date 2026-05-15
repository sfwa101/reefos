import { useEffect, useState } from "react";
import { Wifi, WifiOff, RefreshCw } from "lucide-react";
import { offlineQueueSize, processQueue } from "@/lib/offlineSyncQueue";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

/**
 * Phase 63 — POS Sync Radar.
 * Shows live online/offline state + pending offline mutations count.
 * Tap to force-flush the queue. Pure semantic tokens.
 */
export function PosSyncPill({ online }: { online: boolean }) {
  const [pending, setPending] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      const n = await offlineQueueSize();
      if (!cancelled) setPending(n);
    };
    tick();
    const i = setInterval(tick, 4000);
    return () => { cancelled = true; clearInterval(i); };
  }, []);

  // Auto-flush when we come back online
  useEffect(() => {
    if (!online || pending === 0) return;
    let cancelled = false;
    (async () => {
      setBusy(true);
      const r = await processQueue();
      if (cancelled) return;
      setBusy(false);
      if (r.ok > 0) toast.success(`تمت مزامنة ${r.ok} عملية`);
      const n = await offlineQueueSize();
      if (!cancelled) setPending(n);
    })();
    return () => { cancelled = true; };
  }, [online, pending]);

  const flush = async () => {
    if (busy || pending === 0) return;
    setBusy(true);
    const r = await processQueue();
    setBusy(false);
    setPending(r.remaining);
    if (r.ok > 0) toast.success(`تمت مزامنة ${r.ok} عملية`);
    if (r.failed > 0) toast.error(`فشلت ${r.failed} عملية — ستُعاد لاحقاً`);
  };

  if (online && pending === 0) {
    return (
      <div className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1 text-success ring-1 ring-success/20">
        <Wifi className="h-3.5 w-3.5" />
        <span className="text-[11px] font-bold">متصل</span>
      </div>
    );
  }

  if (!online) {
    return (
      <Button
        onClick={flush}
        className="inline-flex items-center gap-1.5 rounded-full bg-warning/10 px-2.5 py-1 text-warning ring-1 ring-warning/20"
      >
        <WifiOff className="h-3.5 w-3.5" />
        <span className="text-[11px] font-bold">أوفلاين · يُحفظ محلياً</span>
        {pending > 0 && (
          <span className="rounded-full bg-warning px-1.5 text-[10px] font-extrabold text-warning-foreground">{pending}</span>
        )}
      </Button>
    );
  }

  // online + has pending — show sync action
  return (
    <Button
      onClick={flush}
      disabled={busy}
      className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-primary ring-1 ring-primary/20 disabled:opacity-60"
    >
      <RefreshCw className={`h-3.5 w-3.5 ${busy ? "animate-spin" : ""}`} />
      <span className="text-[11px] font-bold">مزامنة {pending}</span>
    </Button>
  );
}

export default PosSyncPill;
