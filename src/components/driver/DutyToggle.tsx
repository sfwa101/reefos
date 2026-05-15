/**
 * DutyToggle — Driver shift on/off control (Wave D-1.A).
 *
 * Sovereign path: only talks to `*DriverShiftFn` server functions, which
 * write to `salsabil_driver_shifts` under RLS. No `supabase.from` here.
 */
import { useEffect, useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  getActiveDriverShiftFn,
  startDriverShiftFn,
  endDriverShiftFn,
  type DriverShiftRow,
} from "@/core/logistics/driver.functions";
import { Button } from "@/components/ui/button";
import { Power, PowerOff, Loader2 } from "lucide-react";
import { toast } from "sonner";

function formatElapsed(startedAt: string, now: number): string {
  const ms = Math.max(0, now - new Date(startedAt).getTime());
  const m = Math.floor(ms / 60_000);
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return h > 0 ? `${h}س ${mm}د` : `${mm}د`;
}

export function DutyToggle() {
  const getActive = useServerFn(getActiveDriverShiftFn);
  const startShift = useServerFn(startDriverShiftFn);
  const endShift = useServerFn(endDriverShiftFn);

  const [shift, setShift] = useState<DriverShiftRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const refresh = useCallback(async () => {
    try {
      const row = await getActive();
      setShift(row);
    } catch (e) {
      // Driver not linked or other → leave shift null silently
      void e;
      setShift(null);
    } finally {
      setLoading(false);
    }
  }, [getActive]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!shift) return;
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, [shift]);

  const onClick = async () => {
    setBusy(true);
    try {
      if (shift) {
        await endShift();
        toast.success("تم إنهاء الوردية");
        setShift(null);
      } else {
        const row = await startShift();
        toast.success("بدأت الوردية");
        setShift(row);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "تعذّر تنفيذ العملية";
      toast.error(msg === "driver_not_linked" ? "حسابك غير مرتبط بمندوب" : msg);
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <Button variant="outline" size="sm" disabled className="gap-1.5">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        <span className="text-[12px]">…</span>
      </Button>
    );
  }

  const active = !!shift;
  return (
    <Button
      variant={active ? "default" : "outline"}
      size="sm"
      onClick={onClick}
      disabled={busy}
      className={`gap-1.5 ${active ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}`}
    >
      {busy ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : active ? (
        <Power className="h-3.5 w-3.5" />
      ) : (
        <PowerOff className="h-3.5 w-3.5" />
      )}
      <span className="text-[12px]">
        {active ? `وردية نشطة · ${formatElapsed(shift!.started_at, now)}` : "بدء الوردية"}
      </span>
    </Button>
  );
}

export default DutyToggle;
