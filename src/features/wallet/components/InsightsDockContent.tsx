import { useMemo } from "react";
import { motion } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Sparkles } from "lucide-react";
import { useWalletTransactions } from "@/features/wallet/hooks/useWalletTransactions";
import { toLatin } from "@/lib/format";

type Slice = { key: string; name: string; value: number; tone: string };

const KIND_LABELS: Record<string, string> = {
  pos: "مشتريات",
  purchase: "مشتريات",
  order: "مشتريات",
  transfer: "تحويلات",
  send: "تحويلات",
  bill: "فواتير",
  utility: "فواتير",
  gam: "جمعيات",
  vault: "حصّالات",
  fee: "رسوم",
};

const TONES = [
  "var(--primary)",
  "color-mix(in oklab, var(--primary) 70%, transparent)",
  "color-mix(in oklab, var(--primary) 45%, transparent)",
  "color-mix(in oklab, var(--primary) 25%, transparent)",
  "color-mix(in oklab, var(--foreground) 25%, transparent)",
];

const labelFor = (kind: string, source: string | null): string => {
  const k = (source || kind || "other").toLowerCase();
  return KIND_LABELS[k] ?? "أخرى";
};

/**
 * InsightsDockContent — "حكيم" donut + monthly snippet.
 * Aggregates outgoing wallet movements by category and renders
 * a theme-aware donut. All colors derive from `--primary`.
 */
export const InsightsDockContent = ({ userId }: { userId: string | null }) => {
  const { rows, loading } = useWalletTransactions(userId);

  const { slices, total, topShare, topName } = useMemo(() => {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const map = new Map<string, number>();
    for (const r of rows) {
      const amt = Number(r.amount);
      if (amt >= 0) continue;
      const ts = new Date(r.created_at);
      if (ts < monthStart) continue;
      const name = labelFor(r.kind, r.source);
      map.set(name, (map.get(name) ?? 0) + Math.abs(amt));
    }
    const arr: Slice[] = Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, value], i) => ({
        key: name,
        name,
        value: Math.round(value),
        tone: TONES[i % TONES.length],
      }));
    const sum = arr.reduce((s, x) => s + x.value, 0);
    const top = arr[0];
    return {
      slices: arr,
      total: sum,
      topShare: top && sum > 0 ? Math.round((top.value / sum) * 100) : 0,
      topName: top?.name ?? "",
    };
  }, [rows]);

  if (loading) {
    return (
      <div className="h-72 animate-pulse rounded-3xl bg-card/60 ring-1 ring-border/40" />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-4"
    >
      <section className="rounded-3xl bg-card text-card-foreground p-5 ring-1 ring-border/50 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[11px] font-bold tracking-wide text-muted-foreground">
              إنفاق هذا الشهر
            </p>
            <p className="font-display text-[22px] font-black tabular-nums leading-none mt-1">
              {toLatin(total)}
              <span className="ms-1 text-[11px] font-bold text-muted-foreground">ج.م</span>
            </p>
          </div>
        </div>

        {slices.length === 0 ? (
          <p className="text-[12px] text-muted-foreground py-10 text-center">
            لا توجد عمليات إنفاق هذا الشهر بعد.
          </p>
        ) : (
          <>
            <div className="h-52 w-full">
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={slices}
                    dataKey="value"
                    nameKey="name"
                    innerRadius="62%"
                    outerRadius="92%"
                    paddingAngle={2}
                    stroke="transparent"
                  >
                    {slices.map((s) => (
                      <Cell key={s.key} fill={s.tone} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: 12,
                      color: "var(--popover-foreground)",
                      fontSize: 12,
                    }}
                    formatter={(v: number) => [`${toLatin(v)} ج.م`, ""]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <ul className="mt-2 grid grid-cols-2 gap-2">
              {slices.map((s) => {
                const pct = total > 0 ? Math.round((s.value / total) * 100) : 0;
                return (
                  <li
                    key={s.key}
                    className="flex items-center gap-2 rounded-xl bg-muted/40 ring-1 ring-border/40 px-2.5 py-1.5"
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ background: s.tone }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-bold truncate">{s.name}</p>
                      <p className="text-[10px] text-muted-foreground tabular-nums">
                        {toLatin(s.value)} ج · {toLatin(pct)}٪
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </section>

      {/* Hakim smart snippet */}
      <section className="relative overflow-hidden rounded-3xl bg-primary/5 ring-1 ring-primary/20 p-4">
        <div className="pointer-events-none absolute -top-8 -left-8 h-28 w-28 rounded-full bg-primary/20 blur-2xl" />
        <div className="relative flex gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[11px] font-extrabold text-primary tracking-wide">
              نصيحة حكيم
            </p>
            <p className="mt-0.5 text-[12.5px] font-bold leading-relaxed text-foreground/90">
              {slices.length === 0
                ? "ابدأ باستخدام محفظتك وسأقدّم لك نصائح مالية مخصّصة شهرياً."
                : `نفقات «${topName}» تمثّل ${toLatin(topShare)}٪ من إنفاقك هذا الشهر — فكّر في توجيه ١٠٪ إضافية لحصّالتك.`}
            </p>
          </div>
        </div>
      </section>
    </motion.div>
  );
};
