import { motion } from "framer-motion";
import { PiggyBank, Settings2, Target, Sparkles, TrendingUp } from "lucide-react";
import { useWalletSavings } from "@/core/finance/hooks/useWalletSavings";
import { toLatin } from "@/lib/format";
import { Button } from "@/components/ui/button";

/**
 * VaultsDockContent — "حصّالاتي" dock panel.
 * Shows the smart-change vault (round-up / fixed) sourced from
 * `savings_jar`, with quick rule preview and a CTA that opens the
 * existing SavingsJarDialog (controlled at the Wallet shell level).
 *
 * Theme-aware: every surface uses semantic tokens.
 */
export const VaultsDockContent = ({
  userId,
  onOpenSettings,
  data,
}: {
  userId: string | null;
  onOpenSettings: () => void;
  data?: ReturnType<typeof useWalletSavings>;
}) => {
  const fallback = useWalletSavings(data ? null : userId);
  const { jar, jarTxs, loading } = data ?? fallback;

  if (loading) {
    return (
      <div className="h-44 animate-pulse rounded-3xl bg-card/60 ring-1 ring-border/40" />
    );
  }

  const balance = Math.round(Number(jar?.balance ?? 0));
  const goal = jar?.goal ? Math.round(Number(jar.goal)) : null;
  const goalLabel = jar?.goal_label ?? null;
  const pct = goal && goal > 0 ? Math.min(100, Math.round((balance / goal) * 100)) : null;
  const ruleLabel = jar?.auto_save_enabled
    ? `تقريب الفكة لأقرب ${toLatin(jar.round_to)} ج.م`
    : "الادخار التلقائي متوقّف";

  return (
    <div className="space-y-4">
      {/* Smart Change Vault */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="relative overflow-hidden rounded-3xl bg-card text-card-foreground p-5 shadow-sm ring-1 ring-border/50"
      >
        <div className="pointer-events-none absolute -top-12 -right-10 h-40 w-40 rounded-full bg-primary/15 blur-3xl" />
        <div className="relative flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/10 text-primary">
              <PiggyBank className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold tracking-wide text-muted-foreground">
                حصّالة الفكة الذكية
              </p>
              <p className="font-display text-[22px] font-black tabular-nums leading-none mt-1">
                {toLatin(balance)}
                <span className="ms-1 text-[11px] font-bold text-muted-foreground">ج.م</span>
              </p>
            </div>
          </div>
          <Button
            type="button"
            onClick={onOpenSettings}
            className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2.5 py-1.5 text-[11px] font-extrabold ring-1 ring-primary/25 active:scale-95 transition"
          >
            <Settings2 className="h-3.5 w-3.5" />
            تعديل
          </Button>
        </div>

        <div className="relative mt-4 grid grid-cols-2 gap-2">
          <RuleChip
            icon={<Sparkles className="h-3.5 w-3.5" />}
            title="القاعدة"
            value={ruleLabel}
          />
          <RuleChip
            icon={<Target className="h-3.5 w-3.5" />}
            title="الهدف"
            value={
              goal
                ? `${goalLabel ?? "هدفي"} · ${toLatin(goal)} ج`
                : "بدون هدف محدّد"
            }
          />
        </div>

        {pct !== null && (
          <div className="relative mt-4">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-foreground/10">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="mt-1.5 text-[10.5px] font-bold text-muted-foreground tabular-nums">
              {toLatin(pct)}٪ نحو الهدف
            </p>
          </div>
        )}
      </motion.section>

      {/* Recent jar movements */}
      <section className="rounded-3xl bg-card text-card-foreground p-4 ring-1 ring-border/50 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[12px] font-extrabold">آخر حركات الحصّالة</p>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </div>
        {jarTxs.length === 0 ? (
          <p className="text-[12px] text-muted-foreground py-6 text-center">
            ابدأ بالادخار وستظهر حركاتك هنا.
          </p>
        ) : (
          <ul className="divide-y divide-border/40">
            {jarTxs.slice(0, 6).map((t) => {
              const positive = Number(t.amount) >= 0;
              return (
                <li
                  key={t.id}
                  className="flex items-center justify-between py-2.5"
                >
                  <div className="min-w-0">
                    <p className="text-[12.5px] font-bold truncate">{t.label || "ادخار"}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(t.created_at).toLocaleDateString("ar-EG", {
                        day: "2-digit",
                        month: "short",
                      })}
                    </p>
                  </div>
                  <p
                    className={`text-[13px] font-black tabular-nums ${
                      positive ? "text-emerald-500" : "text-foreground"
                    }`}
                  >
                    {positive ? "+" : ""}
                    {toLatin(Math.round(Number(t.amount)))} ج
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
};

const RuleChip = ({
  icon,
  title,
  value,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
}) => (
  <div className="rounded-2xl bg-muted/40 ring-1 ring-border/40 p-2.5">
    <div className="flex items-center gap-1.5 text-muted-foreground">
      {icon}
      <p className="text-[10px] font-bold tracking-wide uppercase">{title}</p>
    </div>
    <p className="mt-1 text-[11.5px] font-extrabold text-foreground/90 leading-tight">
      {value}
    </p>
  </div>
);
