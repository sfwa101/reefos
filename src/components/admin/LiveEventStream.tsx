import { Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLiveEventStream } from "@/core/events/hooks/useLiveEventStream";

const domainTone: Record<string, string> = {
  order: "bg-primary/10 text-primary",
  payment: "bg-success/10 text-success",
  inventory: "bg-warning/15 text-warning",
  vendor: "bg-info/10 text-info",
  staff: "bg-[hsl(var(--accent))]/15 text-[hsl(var(--accent))]",
  hakim: "bg-secondary/40 text-foreground-secondary",
};

function formatTime(iso: string) {
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "الآن";
  if (diff < 3600) return `${Math.floor(diff / 60)} د`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} س`;
  return d.toLocaleDateString("ar-EG", { month: "short", day: "numeric" });
}

export function LiveEventStream({ limit = 20 }: { limit?: number }) {
  const { events, connected } = useLiveEventStream(limit);

  return (
    <section className="rounded-3xl bg-card border border-border/50 shadow-soft overflow-hidden">
      <header className="flex items-center justify-between px-4 py-3 border-b border-border/40">
        <div className="flex items-center gap-2 min-w-0">
          <Activity className="h-4 w-4 text-foreground-secondary shrink-0" />
          <h2 className="font-display text-[15px] truncate">السجل الحي</h2>
        </div>
        <span className="flex items-center gap-1.5 text-[10.5px] text-foreground-tertiary">
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              connected ? "bg-success animate-pulse" : "bg-foreground-tertiary/40",
            )}
          />
          {connected ? "متصل" : "غير متصل"}
        </span>
      </header>

      <ol className="divide-y divide-border/40 max-h-[520px] overflow-y-auto">
        {events.length === 0 && (
          <li className="px-4 py-10 text-center text-[12.5px] text-foreground-tertiary">
            لا توجد أحداث بعد
          </li>
        )}
        {events.map((ev) => {
          const domain = (ev.event_domain ?? "system").toLowerCase();
          const chip = domainTone[domain] ?? "bg-muted text-foreground-secondary";
          return (
            <li key={ev.id} className="px-4 py-3 flex items-start gap-3 hover:bg-muted/30 transition-colors">
              <span className={cn("shrink-0 mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-medium", chip)}>
                {domain}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[12.5px] leading-snug text-foreground truncate">
                  {ev.event_type ?? "حدث"}
                </p>
                {ev.payload && Object.keys(ev.payload).length > 0 && (
                  <p className="text-[11px] text-foreground-tertiary leading-snug truncate mt-0.5">
                    {Object.entries(ev.payload)
                      .slice(0, 2)
                      .map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : String(v)}`)
                      .join(" • ")}
                  </p>
                )}
              </div>
              <span className="shrink-0 text-[10.5px] text-foreground-tertiary tabular-nums mt-0.5">
                {formatTime(ev.created_at)}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export default LiveEventStream;
