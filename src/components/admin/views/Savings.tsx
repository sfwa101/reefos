import { PiggyBank, TrendingUp, Coins, Target } from "lucide-react";
import { UniversalAdminGrid } from "@/components/admin/UniversalAdminGrid";
import { fmtMoney, fmtNum } from "@/lib/format";

type SavingsRow = {
  id: string;
  user_id: string;
  balance: number;
  goal: number | null;
  goal_label: string | null;
  round_to: number;
  auto_save_enabled: boolean;
  updated_at: string;
};

const sum = (rows: SavingsRow[], key: keyof SavingsRow) =>
  rows.reduce((s, r) => s + (Number(r[key]) || 0), 0);

export default function SavingsAdmin() {
  return (
    <UniversalAdminGrid<SavingsRow>
      title="الادخار"
      subtitle="حصّالات المستخدمين، الأهداف، والادخار التلقائي"
      dataSource={{
        table: "savings_jar",
        select: "id,user_id,balance,goal,goal_label,round_to,auto_save_enabled,updated_at",
        orderBy: { column: "balance", ascending: false },
        searchKeys: ["goal_label", "user_id"],
      }}
      metrics={[
        {
          key: "jars", label: "حصّالات نشطة", icon: PiggyBank, tone: "primary",
          compute: (rows) => fmtNum(rows.length),
        },
        {
          key: "balance", label: "إجمالي المدّخرات", icon: Coins, tone: "success",
          compute: (rows) => fmtMoney(sum(rows as SavingsRow[], "balance")),
        },
        {
          key: "auto", label: "تلقائي مفعَّل", icon: TrendingUp, tone: "info",
          compute: (rows) => fmtNum((rows as SavingsRow[]).filter(r => r.auto_save_enabled).length),
        },
        {
          key: "goals", label: "بأهداف محدَّدة", icon: Target, tone: "accent",
          compute: (rows) => fmtNum((rows as SavingsRow[]).filter(r => (r.goal ?? 0) > 0).length),
        },
      ]}
      columns={[
        {
          key: "user_id", className: "flex-1",
          render: (r) => (
            <>
              <p className="text-[13px] font-mono">{r.user_id.slice(0, 8)}…</p>
              <p className="text-[11px] text-foreground-tertiary truncate">{r.goal_label || "بدون هدف"}</p>
            </>
          ),
        },
        {
          key: "balance", className: "shrink-0 text-right",
          render: (r) => (
            <>
              <p className="text-[13px] font-display num text-success">{fmtMoney(r.balance)}</p>
              {r.goal ? (
                <p className="text-[10.5px] text-foreground-tertiary num">
                  من {fmtMoney(r.goal)} ({Math.min(100, Math.round((Number(r.balance) / Number(r.goal)) * 100))}%)
                </p>
              ) : null}
            </>
          ),
        },
        {
          key: "auto_save_enabled", className: "shrink-0", hideOnMobile: true,
          render: (r) => (
            <span className={`text-[10.5px] px-2 py-1 rounded-full font-semibold ${r.auto_save_enabled ? "bg-success/15 text-success" : "bg-muted text-foreground-tertiary"}`}>
              {r.auto_save_enabled ? `تقريب +${r.round_to}` : "يدوي"}
            </span>
          ),
        },
      ]}
      searchPlaceholder="ابحث بالهدف أو معرّف المستخدم..."
      empty={{ icon: PiggyBank, title: "لا توجد حصّالات بعد", hint: "ستظهر هنا حصّالات المدّخرات بمجرد إنشاء العملاء لها." }}
    />
  );
}
