/**
 * IncomingOfferModal — Driver Radar overlay for live dispatch offers.
 *
 * Phase 12.3 — Smart Dispatch Acceptance.
 * Mounts globally inside the Driver shell. When a pending offer arrives via
 * the radar, this overlay rings up with a live countdown and Accept/Ignore
 * actions. Ignore dismisses locally until expiry; Accept atomically wins the
 * race via `accept_dispatch_offer`.
 */
import { useEffect, useMemo, useState } from "react";
import { useDispatchRadar } from "../hooks/useDispatchRadar";
import { Button } from "@/components/ui/button";
import { Bell, Check, X, Timer } from "lucide-react";

function formatRemaining(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m > 0 ? `${m}:${String(r).padStart(2, "0")}` : `${r}s`;
}

export function IncomingOfferModal() {
  const { activeOffer, accepting, acceptOffer, dismissOffer } = useDispatchRadar();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!activeOffer) return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [activeOffer]);

  const remainingMs = useMemo(() => {
    if (!activeOffer) return 0;
    return new Date(activeOffer.expires_at).getTime() - now;
  }, [activeOffer, now]);

  if (!activeOffer || remainingMs <= 0) return null;

  const totalMs = Math.max(
    1,
    new Date(activeOffer.expires_at).getTime() -
      new Date(activeOffer.created_at).getTime(),
  );
  const pct = Math.max(0, Math.min(100, (remainingMs / totalMs) * 100));
  const urgent = remainingMs < 10_000;

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      role="dialog"
      aria-live="assertive"
    >
      <div className="w-full max-w-md rounded-2xl bg-surface border border-border/40 shadow-2xl overflow-hidden">
        <div
          className={`flex items-center gap-2 px-4 py-3 ${
            urgent ? "bg-destructive/15 text-destructive" : "bg-primary/10 text-primary"
          }`}
        >
          <Bell className={`h-5 w-5 ${urgent ? "animate-pulse" : ""}`} />
          <div className="flex-1">
            <div className="font-display text-[15px] leading-tight">
              طلب توصيل جديد!
            </div>
            <div className="text-[11px] opacity-80">
              عرض ذكي من نظام برق
            </div>
          </div>
          <div className="flex items-center gap-1 text-sm font-mono tabular-nums">
            <Timer className="h-4 w-4" />
            {formatRemaining(remainingMs)}
          </div>
        </div>

        <div className="h-1 bg-muted">
          <div
            className={`h-full transition-all ${
              urgent ? "bg-destructive" : "bg-primary"
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>

        <div className="p-4 space-y-3">
          <div className="rounded-lg bg-muted/40 p-3 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-foreground-tertiary">رقم العقدة</span>
              <span className="font-mono">{activeOffer.node_id.slice(0, 8)}…</span>
            </div>
            <div className="flex justify-between">
              <span className="text-foreground-tertiary">الحالة</span>
              <span>قيد العرض</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              onClick={() => dismissOffer(activeOffer.id)}
              disabled={accepting}
            >
              <X className="h-4 w-4 ml-1" /> تجاهل
            </Button>
            <Button
              onClick={() => acceptOffer(activeOffer.id)}
              disabled={accepting}
              className={urgent ? "bg-destructive hover:bg-destructive/90" : ""}
            >
              <Check className="h-4 w-4 ml-1" />
              {accepting ? "جارٍ القبول..." : "قبول الطلب"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default IncomingOfferModal;
