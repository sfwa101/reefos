/**
 * Phase T-B.2 — Driver Duty Toggle
 * --------------------------------
 * Single ON/OFF surface for the driver portal. Drives `useDriverTelemetry`
 * (Zustand) which handles geolocation watching + throttled UPSERT to
 * `driver_positions`. Selectors keep re-renders minimal.
 */
import { useEffect, useState } from "react";
import { Power, Compass, Gauge, BatteryMedium, AlertTriangle } from "lucide-react";
import { useDriverTelemetry, type DriverStatus } from "@/apps/reef-al-madina/features/driver/store/useDriverTelemetry";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<DriverStatus, string> = {
  IDLE: "متاح",
  EN_ROUTE: "في توصيلة",
  BREAK: "استراحة",
  OFFLINE: "غير متصل",
};

export function DriverDutyToggle() {
  const watching = useDriverTelemetry((s) => s.watching);
  const status = useDriverTelemetry((s) => s.status);
  const lastPosition = useDriverTelemetry((s) => s.lastPosition);
  const error = useDriverTelemetry((s) => s.error);
  const start = useDriverTelemetry((s) => s.start);
  const stop = useDriverTelemetry((s) => s.stop);
  const setStatus = useDriverTelemetry((s) => s.setStatus);

  const [battery, setBattery] = useState<number | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // @ts-expect-error - non-standard API
        const b = await navigator.getBattery?.();
        if (!cancelled && b) setBattery(Math.round(b.level * 100));
      } catch { /* noop */ }
    })();
    return () => { cancelled = true; };
  }, [watching]);

  const speedKmh = lastPosition?.speed != null
    ? Math.round(lastPosition.speed * 3.6)
    : null;
  const heading = lastPosition?.heading != null
    ? Math.round(lastPosition.heading)
    : null;

  return (
    <div dir="rtl" className="rounded-2xl border border-border bg-card p-5 space-y-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-lg font-bold text-foreground">حالة المناوبة</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {watching ? STATUS_LABEL[status] : "اضغط لبدء استقبال الطلبات"}
          </p>
        </div>
        <Button
          size="lg"
          variant={watching ? "destructive" : "default"}
          onClick={() => (watching ? stop() : start("IDLE"))}
          className="rounded-full gap-2"
        >
          <Power className="size-4" />
          {watching ? "إيقاف" : "بدء"}
        </Button>
      </div>

      {watching && (
        <div className="grid grid-cols-2 gap-2">
          {(["IDLE", "BREAK"] as DriverStatus[]).map((s) => (
            <Button
              key={s}
              onClick={() => setStatus(s)}
              className={cn(
                "rounded-xl border px-3 py-2 text-sm font-medium transition",
                status === s
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-background text-muted-foreground hover:bg-muted",
              )}
            >
              {STATUS_LABEL[s]}
            </Button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        <Readout
          icon={<Gauge className="size-4" />}
          label="السرعة"
          value={speedKmh != null ? `${speedKmh} كم/س` : "—"}
        />
        <Readout
          icon={<Compass className="size-4" />}
          label="الاتجاه"
          value={heading != null ? `${heading}°` : "—"}
        />
        <Readout
          icon={<BatteryMedium className="size-4" />}
          label="البطارية"
          value={battery != null ? `${battery}%` : "—"}
        />
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-xs text-destructive">
          <AlertTriangle className="size-4 mt-0.5 shrink-0" />
          <span>تعذر الوصول إلى الموقع: {error}</span>
        </div>
      )}
    </div>
  );
}

function Readout({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted/40 px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div className="mt-1 font-mono text-sm font-bold text-foreground tabular-nums">{value}</div>
    </div>
  );
}
