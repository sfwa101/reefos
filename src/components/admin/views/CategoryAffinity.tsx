import { Layers, Loader2, Network, ShieldAlert, Sparkles, Target, TrendingUp } from "lucide-react";
import { UniversalAdminGrid } from "@/components/admin/UniversalAdminGrid";
import { useAdminRoles } from "@/components/admin/RoleGuard";
import { MobileTopbar } from "@/components/admin/MobileTopbar";
import { getCategoryAffinityFn } from "@/core/hakim-ai/hakim-admin.functions";
import { fmtNum } from "@/lib/format";

interface AffinityRow {
  category: string;
  views: number;
  add_to_cart: number;
  purchases: number;
  affinity_score: number;
  unique_users: number;
}

/**
 * Category Affinity — derived from `user_behavior_logs` (last 60 days).
 * No backing table — we aggregate live with a server-trusted query.
 * Read-only intelligence panel for cross-selling and merchandising.
 */
export default function CategoryAffinity() {
  const { hasRole, loading: rolesLoading } = useAdminRoles();
  const allowed = hasRole("admin") || hasRole("finance") || hasRole("store_manager");

  const fetchAffinity = async (): Promise<AffinityRow[]> => {
    try {
      const rows = await getCategoryAffinityFn();
      return (rows ?? []) as AffinityRow[];
    } catch {
      return [];
    }
  };

  if (rolesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }
  if (!allowed) {
    return (
      <>
        <MobileTopbar title="ارتباط الفئات" />
        <div className="p-8 text-center" dir="rtl">
          <ShieldAlert className="h-12 w-12 mx-auto text-foreground-tertiary mb-3" />
          <p>غير متاح لدورك الحالي</p>
        </div>
      </>
    );
  }

  return (
    <UniversalAdminGrid<AffinityRow>
      title="ارتباط الفئات — Affinity Map"
      subtitle="ذكاء حكيم لتعزيز البيع المتقاطع (آخر 60 يوماً)"
      dataSource={{
        fetcher: fetchAffinity,
        searchKeys: ["category"],
      }}
      rowKey={(r) => r.category}
      metrics={[
        {
          key: "cats",
          label: "فئات نشطة",
          icon: Layers,
          tone: "primary",
          compute: (rows) => fmtNum(rows.length),
        },
        {
          key: "top",
          label: "أقوى فئة",
          icon: Sparkles,
          tone: "purple",
          compute: (rows) => (rows[0]?.category ? rows[0].category.slice(0, 14) : "—"),
        },
        {
          key: "purchases",
          label: "مشتريات (مرجّحة)",
          icon: TrendingUp,
          tone: "success",
          compute: (rows) => fmtNum(rows.reduce((s, r) => s + r.purchases, 0)),
        },
        {
          key: "users",
          label: "عملاء فاعلون",
          icon: Target,
          tone: "info",
          compute: (rows) => fmtNum(rows.reduce((s, r) => s + r.unique_users, 0)),
        },
      ]}
      columns={[
        {
          key: "cat",
          className: "flex-1 min-w-0",
          render: (r) => (
            <div className="min-w-0">
              <p className="font-display text-[13.5px] truncate">{r.category}</p>
              <p className="text-[10.5px] text-foreground-tertiary num">
                مشاهدات: {fmtNum(r.views)} • سلة: {fmtNum(r.add_to_cart)} • شراء: {fmtNum(r.purchases)}
              </p>
            </div>
          ),
        },
        {
          key: "users",
          className: "shrink-0 text-left",
          hideOnMobile: true,
          render: (r) => <p className="text-[12px] num text-foreground-secondary">عملاء: {fmtNum(r.unique_users)}</p>,
        },
        {
          key: "score",
          className: "shrink-0",
          render: (r) => (
            <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold bg-primary-soft text-primary num">
              {fmtNum(r.affinity_score)}
            </span>
          ),
        },
      ]}
      empty={{
        icon: Network,
        title: "لا توجد بيانات سلوك بعد",
        hint: "ستبدأ خريطة الارتباط بالظهور بعد تسجيل تفاعلات العملاء.",
      }}
    />
  );
}
