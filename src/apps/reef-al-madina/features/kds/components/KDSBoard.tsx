/**
 * Salsabil OS — Phase 1 · Wave 5
 * Layer 6 (Runtime UI) · KDS Board.
 *
 * Pure projection of {@link KDSRuntime}. The component holds zero
 * business logic and never touches Supabase directly. It dispatches
 * intents (markPreparing/markReady/markDelivered) to the runtime and
 * subscribes to ticket snapshots for re-renders.
 */
import { useEffect, useMemo, useState } from "react";
import { ChefHat, Play, CheckCircle2, PackageCheck } from "lucide-react";
import {
  kdsRuntime,
  type KDSTicket,
  type KDSTicketStatus,
} from "@/core/kds/runtime/KDSRuntime";
import { kdsOrderPlacedReactor } from "@/core/events/handlers/KDSOrderPlacedReactor";
import { Button } from "@/components/ui/button";

const STATUS_ORDER: Record<KDSTicketStatus, number> = {
  queued: 0,
  preparing: 1,
  ready: 2,
  delivered: 3,
};

const STATUS_LABEL: Record<KDSTicketStatus, string> = {
  queued: "بانتظار",
  preparing: "قيد التجهيز",
  ready: "جاهز",
  delivered: "تم التسليم",
};

const STATUS_BADGE: Record<KDSTicketStatus, string> = {
  queued: "bg-muted text-muted-foreground",
  preparing: "bg-amber-500/20 text-amber-500",
  ready: "bg-emerald-500/20 text-emerald-500",
  delivered: "bg-primary/20 text-primary",
};

const useKDSTickets = (): ReadonlyArray<KDSTicket> => {
  const [tickets, setTickets] = useState<ReadonlyArray<KDSTicket>>(
    kdsRuntime.getTickets(),
  );
  useEffect(() => {
    const off = kdsOrderPlacedReactor.attach();
    const unsub = kdsRuntime.subscribe(setTickets);
    return () => {
      unsub();
      off();
    };
  }, []);
  return tickets;
};

export function KDSBoard() {
  const tickets = useKDSTickets();
  const sorted = useMemo(
    () =>
      [...tickets].sort((a, b) => {
        const s = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
        return s !== 0 ? s : a.createdAt - b.createdAt;
      }),
    [tickets],
  );

  if (sorted.length === 0) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-2 text-muted-foreground">
        <ChefHat className="h-8 w-8" />
        <p className="text-sm">لا توجد تذاكر مطبخ نشطة</p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 p-3">
      {sorted.map((t) => (
        <KDSTicketCard key={t.id} ticket={t} />
      ))}
    </div>
  );
}

function KDSTicketCard({ ticket }: { ticket: KDSTicket }) {
  const dispatch = (next: KDSTicketStatus) => {
    if (next === "preparing") kdsRuntime.markPreparing(ticket.id);
    else if (next === "ready") kdsRuntime.markReady(ticket.id);
    else if (next === "delivered") kdsRuntime.markDelivered(ticket.id);
  };

  return (
    <article className="rounded-xl border border-border bg-card/60 p-3 flex flex-col gap-3 min-h-[200px]">
      <header className="flex items-center justify-between gap-2">
        <div className="font-mono text-[13px] font-extrabold text-foreground">
          #{ticket.id.slice(-6).toUpperCase()}
        </div>
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10.5px] font-bold ${STATUS_BADGE[ticket.status]}`}
        >
          {STATUS_LABEL[ticket.status]}
        </span>
      </header>

      <ul className="flex-1 space-y-1.5 text-[13.5px]">
        {ticket.lines.map((l) => (
          <li key={l.lineId} className="flex items-baseline gap-2">
            <span className="inline-flex h-6 min-w-[28px] items-center justify-center rounded-md bg-muted px-1.5 font-mono text-[12px] font-bold text-amber-500">
              ×{l.qty}
            </span>
            <span className="text-foreground leading-snug">{l.name}</span>
          </li>
        ))}
      </ul>

      <footer>
        {ticket.status === "queued" && (
          <Button
            type="button"
            onClick={() => dispatch("preparing")}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-background font-extrabold py-2.5 text-[13px] transition active:scale-[0.98]"
          >
            <Play className="h-4 w-4" /> ابدأ التجهيز
          </Button>
        )}
        {ticket.status === "preparing" && (
          <Button
            type="button"
            onClick={() => dispatch("ready")}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-background font-extrabold py-2.5 text-[13px] transition active:scale-[0.98]"
          >
            <CheckCircle2 className="h-4 w-4" /> جاهز
          </Button>
        )}
        {ticket.status === "ready" && (
          <Button
            type="button"
            onClick={() => dispatch("delivered")}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-extrabold py-2.5 text-[13px] transition active:scale-[0.98]"
          >
            <PackageCheck className="h-4 w-4" /> تم التسليم
          </Button>
        )}
        {ticket.status === "delivered" && (
          <div className="w-full text-center text-[12px] font-bold text-primary py-2">
            مكتمل
          </div>
        )}
      </footer>
    </article>
  );
}

export default KDSBoard;
