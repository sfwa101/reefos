/**
 * Phase 55 — KDS main board (`/kds`).
 *
 * A dense grid of order tickets. Each card surfaces:
 *   • short order id, age, prep status badge
 *   • items + quantities (the only thing the kitchen actually needs)
 *   • one large action button: Start → Ready → (handed off)
 *
 * Late tickets (>15min in pending or preparing) glow red.
 */
import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2, Play, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useKdsEngine, type KdsTicket } from "@/apps/reef-al-madina/features/kds/hooks/useKdsEngine";
import type { PrepStatus } from "@/apps/reef-al-madina/features/kds/types";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_kds/kds")({
  component: KdsBoard,
});

const WARN_THRESHOLD_MS = 5 * 60_000;
const LATE_THRESHOLD_MS = 15 * 60_000;

function KdsBoard() {
  const { tickets, loading, error, setPrepStatus } = useKdsEngine();
  const [now, setNow] = useState(() => Date.now());

  // Re-tick every 15s so age + late state stay accurate.
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => window.clearInterval(t);
  }, []);

  const sorted = useMemo(() => {
    const order: Record<PrepStatus, number> = { preparing: 0, pending: 1, ready: 2 };
    return [...tickets].sort((a, b) => {
      const s = order[a.prep.status] - order[b.prep.status];
      if (s !== 0) return s;
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });
  }, [tickets]);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="m-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-200 text-sm">
        {error}
      </div>
    );
  }
  if (sorted.length === 0) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-2 text-muted-foreground">
        <CheckCircle2 className="h-8 w-8 text-emerald-500" />
        <p className="text-sm">لا توجد تذاكر — المطبخ فاضي 🎉</p>
      </div>
    );
  }

  return (
    <div className="p-3 grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
      {sorted.map((t) => (
        <TicketCard
          key={t.id}
          ticket={t}
          now={now}
          onAction={async (next) => {
            try {
              await setPrepStatus(t.id, next);
              toast.success(next === "preparing" ? "بدأ التجهيز" : "جاهز للتسليم ✅");
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "تعذّر التحديث");
            }
          }}
        />
      ))}
    </div>
  );
}

function TicketCard({
  ticket, now, onAction,
}: {
  ticket: KdsTicket;
  now: number;
  onAction: (next: PrepStatus) => void | Promise<void>;
}) {
  const ageMs = now - new Date(ticket.created_at).getTime();
  const ageMin = Math.max(0, Math.floor(ageMs / 60_000));
  const isLate = ticket.prep.status !== "ready" && ageMs > LATE_THRESHOLD_MS;

  const statusColor =
    ticket.prep.status === "ready" ? "border-emerald-500/40 bg-emerald-500/5"
    : ticket.prep.status === "preparing" ? "border-amber-500/40 bg-amber-500/5"
    : isLate ? "border-destructive/60 bg-destructive/10 ring-1 ring-destructive/30"
    : "border-border bg-card/60";

  const shortId = ticket.id.slice(0, 6).toUpperCase();

  return (
    <article className={`rounded-xl border ${statusColor} p-3 flex flex-col gap-3 min-h-[220px]`}>
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-mono font-extrabold text-foreground text-[15px]">#{shortId}</span>
          <StatusPill status={ticket.prep.status} />
        </div>
        <div className={`inline-flex items-center gap-1 text-[11px] font-mono ${isLate ? "text-destructive" : "text-muted-foreground"}`}>
          {isLate ? <AlertTriangle className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
          {ageMin}د
        </div>
      </header>

      <ul className="flex-1 space-y-1.5 text-[13.5px]">
        {ticket.items.length === 0 && (
          <li className="text-muted-foreground text-[12px]">لا توجد أصناف مرتبطة</li>
        )}
        {ticket.items.map((it) => (
          <li key={it.id} className="flex items-baseline gap-2">
            <span className="inline-flex h-6 min-w-[28px] items-center justify-center rounded-md bg-muted px-1.5 font-mono text-[12px] font-bold text-amber-500">
              ×{it.quantity}
            </span>
            <span className="text-foreground leading-snug">
              {it.sku_name ?? "—"}
            </span>
          </li>
        ))}
      </ul>

      {ticket.notes && (
        <p className="rounded-md bg-muted/70 p-2 text-[11.5px] text-muted-foreground leading-relaxed">
          {ticket.notes}
        </p>
      )}

      <footer>
        {ticket.prep.status === "pending" && (
          <Button
            type="button"
            onClick={() => onAction("preparing")}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-background font-extrabold py-2.5 text-[13px] transition active:scale-[0.98]"
          >
            <Play className="h-4 w-4" /> ابدأ التجهيز
          </Button>
        )}
        {ticket.prep.status === "preparing" && (
          <Button
            type="button"
            onClick={() => onAction("ready")}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-background font-extrabold py-2.5 text-[13px] transition active:scale-[0.98]"
          >
            <CheckCircle2 className="h-4 w-4" /> تم التجهيز
          </Button>
        )}
        {ticket.prep.status === "ready" && (
          <div className="w-full text-center text-[12px] font-bold text-emerald-500 py-2">
            بانتظار المندوب / الكاشير
          </div>
        )}
      </footer>
    </article>
  );
}

function StatusPill({ status }: { status: PrepStatus }) {
  const map: Record<PrepStatus, { label: string; cls: string }> = {
    pending:   { label: "بانتظار",     cls: "bg-muted text-muted-foreground" },
    preparing: { label: "قيد التجهيز", cls: "bg-amber-500/20 text-amber-500" },
    ready:     { label: "جاهز",        cls: "bg-emerald-500/20 text-emerald-500" },
  };
  const m = map[status];
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10.5px] font-bold ${m.cls}`}>
      {m.label}
    </span>
  );
}
