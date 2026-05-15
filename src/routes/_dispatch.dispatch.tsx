/**
 * Phase 56 — Dispatch board.
 *
 * Lists fulfillment nodes ready for handover. Click → OTP dialog → calls
 * `confirm_handover` RPC. Token-pure UI; visibility-governed realtime.
 */
import { useCallback, useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Bike, User, Loader2, X } from "lucide-react";
import { LogisticsExtras } from "@/core/logistics/gateway/LogisticsGateway";
import { useVisibilitySocket } from "@/core/events/hooks/useVisibilitySocket";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_dispatch/dispatch")({
  component: DispatchBoard,
});

interface DispatchTicket {
  id: string;
  master_order_id: string | null;
  total_amount: number;
  notes: string | null;
  created_at: string;
}

type Channel = "driver" | "walkin";

function DispatchBoard() {
  const [tickets, setTickets] = useState<DispatchTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [target, setTarget] = useState<{ ticket: DispatchTicket; channel: Channel } | null>(null);

  const refresh = useCallback(async () => {
    const data = await LogisticsExtras.listReadyForPickupNodes();
    setTickets(data as DispatchTicket[]);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  useVisibilitySocket(
    () => {
      const ch = LogisticsExtras.subscribeFulfillmentNodes(() => { refresh(); });
      return () => { ch.unsubscribe(); };
    },
    () => { refresh(); },
    [refresh],
  );

  return (
    <div className="p-4">
      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
          <Loader2 className="h-4 w-4 animate-spin" /> جارٍ التحميل…
        </div>
      ) : tickets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
          <span className="text-[13px]">لا توجد طلبات بانتظار التسليم</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {tickets.map((t) => (
            <DispatchCard
              key={t.id}
              ticket={t}
              onPick={(channel) => setTarget({ ticket: t, channel })}
            />
          ))}
        </div>
      )}

      {target && (
        <OtpDialog
          ticket={target.ticket}
          channel={target.channel}
          onClose={() => setTarget(null)}
          onConfirmed={(id) => {
            setTickets((cur) => cur.filter((x) => x.id !== id));
            setTarget(null);
          }}
        />
      )}
    </div>
  );
}

function DispatchCard({
  ticket,
  onPick,
}: {
  ticket: DispatchTicket;
  onPick: (channel: Channel) => void;
}) {
  const shortId = ticket.id.slice(0, 6).toUpperCase();
  return (
    <div className="rounded-xl border border-border bg-card p-3 flex flex-col gap-3 ring-1 ring-primary/15">
      <div className="flex items-center justify-between">
        <span className="font-mono font-extrabold text-[13px] text-foreground">#{shortId}</span>
        <span className="text-[11.5px] text-muted-foreground tabular-nums">
          {Number(ticket.total_amount ?? 0).toFixed(2)}
        </span>
      </div>
      {ticket.notes && (
        <p className="text-[11.5px] text-muted-foreground line-clamp-2">{ticket.notes}</p>
      )}
      <div className="grid grid-cols-2 gap-2 mt-auto">
        <Button
          type="button"
          onClick={() => onPick("walkin")}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary text-primary-foreground px-2.5 py-2 text-[11.5px] font-extrabold active:scale-[0.98] transition"
        >
          <User className="h-3.5 w-3.5" /> عميل
        </Button>
        <Button
          type="button"
          onClick={() => onPick("driver")}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-secondary text-secondary-foreground px-2.5 py-2 text-[11.5px] font-extrabold active:scale-[0.98] transition ring-1 ring-border"
        >
          <Bike className="h-3.5 w-3.5" /> مندوب
        </Button>
      </div>
    </div>
  );
}

function OtpDialog({
  ticket,
  channel,
  onClose,
  onConfirmed,
}: {
  ticket: DispatchTicket;
  channel: Channel;
  onClose: () => void;
  onConfirmed: (id: string) => void;
}) {
  const [otp, setOtp] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const shortId = ticket.id.slice(0, 6).toUpperCase();

  const submit = async () => {
    if (otp.trim().length === 0) {
      toast.error("أدخل رمز التحقق");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await LogisticsExtras.confirmHandover({
        nodeId: ticket.id,
        otp: otp.trim(),
        channel,
      });
      if (error) throw new Error(error.message);
      toast.success("تم تسليم الطلب بنجاح");
      onConfirmed(ticket.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذّر تأكيد التسليم");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-[14px] font-extrabold text-foreground">
              تأكيد التسليم #{shortId}
            </h2>
            <p className="text-[11.5px] text-muted-foreground mt-0.5">
              {channel === "walkin" ? "عميل (Walk-in)" : "مندوب توصيل"}
            </p>
          </div>
          <Button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
            aria-label="إغلاق"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <label className="block text-[11.5px] text-muted-foreground mb-1.5">
          رمز التحقق (OTP)
        </label>
        <Input
          type="tel"
          inputMode="numeric"
          autoFocus
          maxLength={6}
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
          onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
          placeholder="••••"
          className="w-full rounded-lg border border-border bg-background text-foreground text-center font-mono text-[20px] tracking-[0.5em] py-3 outline-none focus:ring-2 focus:ring-primary/40"
        />

        <div className="grid grid-cols-2 gap-2 mt-4">
          <Button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-muted text-muted-foreground px-3 py-2 text-[12px] font-bold"
          >
            إلغاء
          </Button>
          <Button
            type="button"
            onClick={submit}
            disabled={submitting}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary text-primary-foreground px-3 py-2 text-[12px] font-extrabold disabled:opacity-60"
          >
            {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            تأكيد التسليم
          </Button>
        </div>
      </div>
    </div>
  );
}
