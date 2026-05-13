import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  HeartPulse,
  ShieldAlert,
  Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toLatin } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Anomaly = {
  id: string;
  type: string;
  severity: "info" | "warning" | "error" | "critical";
  description: string;
  source: string | null;
  occurrences: number;
  resolved: boolean;
  payload: Record<string, any>;
  created_at: string;
};

type Pulse = {
  anomalies_total: number;
  anomalies_open: number;
  by_severity: Record<string, number>;
  active_users_15m: number;
};

const SEV_COLOR: Record<Anomaly["severity"], string> = {
  info: "bg-primary/10 text-primary ring-primary/20",
  warning: "bg-amber-500/15 text-amber-700 ring-amber-500/30",
  error: "bg-destructive/15 text-destructive ring-destructive/30",
  critical: "bg-destructive/25 text-destructive ring-destructive/40",
};

/**
 * HakimPulseMonitor — live heartbeat + anomaly feed.
 * Renders the local-first agent's findings; uses Supabase Realtime to update
 * live without polling. Pure presentational shell — never mutates state.
 */
export const HakimPulseMonitor = () => {
  const [pulse, setPulse] = useState<Pulse | null>(null);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const sb = supabase as any;
    const [{ data: stats }, { data: rows }] = await Promise.all([
      sb.rpc("hakim_pulse_stats", { _minutes: 60 }),
      sb
        .from("hakim_anomalies")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(30),
    ]);
    setPulse((stats as Pulse) ?? null);
    setAnomalies((rows as Anomaly[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const channel = (supabase as any)
      .channel("hakim_anomalies_feed")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "hakim_anomalies" },
        () => load(),
      )
      .subscribe();
    const interval = window.setInterval(load, 60_000);
    return () => {
      try {
        (supabase as any).removeChannel(channel);
      } catch {}
      window.clearInterval(interval);
    };
  }, []);

  const resolve = async (id: string) => {
    const { error } = await (supabase.rpc as any)("resolve_anomaly", { _id: id });
    if (error) {
      toast.error("تعذّر التحديد كمحلول");
    } else {
      toast.success("تم تحديد المشكلة كمحلولة");
      load();
    }
  };

  return (
    <div className="space-y-4" dir="rtl">
      {/* HEARTBEAT */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl bg-gradient-to-br from-primary to-primary-glow p-4 text-primary-foreground shadow-float"
      >
        <div className="flex items-center gap-2">
          <motion.div
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/30"
          >
            <HeartPulse className="h-4 w-4" />
          </motion.div>
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] opacity-90">
              نبض النظام
            </p>
            <p className="text-[12px] font-bold opacity-95">
              مراقبة لحظية بدون استهلاك ذكاء اصطناعي
            </p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-3">
          <div>
            <div className="flex items-center gap-1 text-[10px] opacity-80">
              <Users className="h-3 w-3" /> مستخدمون نشطون
            </div>
            <p className="font-display text-2xl font-extrabold tabular-nums">
              {toLatin(pulse?.active_users_15m ?? 0)}
            </p>
          </div>
          <div>
            <div className="flex items-center gap-1 text-[10px] opacity-80">
              <AlertTriangle className="h-3 w-3" /> إنذارات مفتوحة
            </div>
            <p className="font-display text-2xl font-extrabold tabular-nums">
              {toLatin(pulse?.anomalies_open ?? 0)}
            </p>
          </div>
          <div>
            <div className="flex items-center gap-1 text-[10px] opacity-80">
              <Activity className="h-3 w-3" /> آخر ساعة
            </div>
            <p className="font-display text-2xl font-extrabold tabular-nums">
              {toLatin(pulse?.anomalies_total ?? 0)}
            </p>
          </div>
        </div>

        {pulse?.by_severity && Object.keys(pulse.by_severity).length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {Object.entries(pulse.by_severity).map(([sev, c]) => (
              <span
                key={sev}
                className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-extrabold ring-1 ring-white/20"
              >
                {sev}: {toLatin(c as number)}
              </span>
            ))}
          </div>
        )}
      </motion.div>

      {/* FEED */}
      <div>
        <div className="mb-2 flex items-center gap-1.5 px-1 text-[11px] font-bold text-muted-foreground">
          <ShieldAlert className="h-3.5 w-3.5" /> سجل الحوادث المحلية
        </div>
        {loading ? (
          <div className="rounded-2xl bg-card p-6 text-center text-[12px] text-muted-foreground ring-1 ring-border/40">
            جاري التحميل...
          </div>
        ) : anomalies.length === 0 ? (
          <div className="rounded-2xl bg-card p-6 text-center text-[12px] text-muted-foreground ring-1 ring-border/40">
            لا توجد حوادث 🌿 — كل شيء طبيعي.
          </div>
        ) : (
          <div className="divide-y divide-border/60 rounded-2xl bg-card shadow-soft ring-1 ring-border/40">
            {anomalies.map((a) => (
              <div key={a.id} className="px-4 py-2.5 text-[11px]">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className={`shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-extrabold ring-1 ${SEV_COLOR[a.severity] ?? SEV_COLOR.info}`}
                    >
                      {a.severity}
                    </span>
                    <span className="truncate font-bold">{a.type}</span>
                    {a.occurrences > 1 && (
                      <span className="shrink-0 rounded-md bg-foreground/10 px-1.5 py-0.5 text-[9px] font-extrabold">
                        ×{toLatin(a.occurrences)}
                      </span>
                    )}
                  </div>
                  <span className="shrink-0 text-[9px] text-muted-foreground">
                    {new Date(a.created_at).toLocaleTimeString("ar-EG", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-foreground/80">
                  {a.description}
                </p>
                {!a.resolved && (
                  <div className="mt-1.5 flex justify-end">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-[10px]"
                      onClick={() => resolve(a.id)}
                    >
                      <CheckCircle2 className="me-1 h-3 w-3" /> تحديد كمحلول
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
