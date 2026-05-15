/**
 * Entities Directory — WAVE UI-13 (Steel Glass overhaul).
 *
 * Replaces the legacy iOS card list with the Glass Arsenal:
 *   • SectionHeader + GlassKpiCard tiles for directory totals.
 *   • GlassTable for the entity roster with adaptive role badges.
 *   • GlassDialog hydrating Customer 360 (profile + recent orders + wallet).
 *
 * Data fidelity: zero new fetching. We reuse listCustomersFn + getCustomer360Fn
 * via React Query and surface them through the dumb glass primitives.
 */
import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ExternalLink,
  Phone,
  Search,
  Sparkles,
  UserCircle2,
  Users,
} from "lucide-react";

import { MobileTopbar } from "@/components/admin/MobileTopbar";
import { SectionHeader } from "@/components/admin/ui/SectionHeader";
import { GlassKpiCard } from "@/components/admin/ui/GlassKpiCard";
import {
  GlassTable,
  type GlassTableColumn,
} from "@/components/admin/ui/GlassTable";
import { GlassEmptyState } from "@/components/admin/ui/GlassEmptyState";
import { GlassDialog, GlassDialogClose } from "@/components/admin/ui/GlassDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { fmtMoney, fmtNum } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  getCustomer360Fn,
  listCustomersFn,
  type CustomerListRow,
} from "@/core/crm/crm.functions";

type AdaptiveRole = {
  label: string;
  className: string;
};

/** Derive the adaptive role chip from the customer's spending bracket. */
const roleForBudget = (budget: string | null): AdaptiveRole => {
  switch ((budget ?? "").toLowerCase()) {
    case "high":
    case "wholesale":
      return {
        label: "تاجر جملة",
        className:
          "border border-violet-200/60 bg-violet-500/15 text-violet-700",
      };
    case "medium":
      return {
        label: "عميل دائم",
        className:
          "border border-emerald-200/60 bg-emerald-500/15 text-emerald-700",
      };
    case "low":
      return {
        label: "عميل اقتصادي",
        className: "border border-sky-200/60 bg-sky-500/15 text-sky-700",
      };
    default:
      return {
        label: "عميل",
        className:
          "border border-foreground/15 bg-white/40 text-foreground/70",
      };
  }
};

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("ar-EG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

export default function Customers() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);

  const customersQ = useQuery({
    queryKey: ["admin", "customers", "list"],
    queryFn: () => listCustomersFn(),
    staleTime: 30_000,
  });

  const filtered = useMemo<CustomerListRow[]>(() => {
    const list = customersQ.data ?? [];
    const t = q.trim().toLowerCase();
    if (!t) return list;
    return list.filter(
      (c) =>
        (c.full_name ?? "").toLowerCase().includes(t) ||
        (c.phone ?? "").includes(t),
    );
  }, [customersQ.data, q]);

  const stats = useMemo(() => {
    const list = customersQ.data ?? [];
    const sevenDays = 7 * 86400 * 1000;
    return {
      total: list.length,
      new7: list.filter(
        (c) => Date.now() - new Date(c.created_at).getTime() < sevenDays,
      ).length,
      withPhone: list.filter((c) => c.phone).length,
      wholesale: list.filter(
        (c) => (c.budget_range ?? "").toLowerCase() === "high",
      ).length,
    };
  }, [customersQ.data]);

  const columns: GlassTableColumn<CustomerListRow>[] = [
    {
      id: "name",
      header: "الكيان",
      cell: (c) => {
        const initials = (c.full_name ?? "؟")
          .trim()
          .split(" ")
          .map((w) => w[0])
          .slice(0, 2)
          .join("");
        return (
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/30 to-primary/5 text-[12px] font-extrabold text-primary ring-1 ring-white/40 backdrop-blur-md">
              {initials || "؟"}
            </div>
            <div className="min-w-0">
              <p className="truncate text-[13.5px] font-semibold">
                {c.full_name ?? "بدون اسم"}
              </p>
              <p className="truncate text-[11px] text-foreground/55">
                مُسجَّل {fmtDate(c.created_at)}
              </p>
            </div>
          </div>
        );
      },
    },
    {
      id: "phone",
      header: "رقم / معرّف",
      hideOnMobile: true,
      cell: (c) =>
        c.phone ? (
          <span
            dir="ltr"
            className="inline-flex items-center gap-1.5 font-mono text-[12px] text-foreground/80"
          >
            <Phone className="h-3 w-3 text-foreground/50" strokeWidth={2.4} />
            {c.phone}
          </span>
        ) : (
          <span className="text-[11.5px] text-foreground/40">—</span>
        ),
    },
    {
      id: "role",
      header: "الدور التكيّفي",
      align: "center",
      cell: (c) => {
        const role = roleForBudget(c.budget_range);
        return (
          <Badge
            className={cn(
              "rounded-full text-[10.5px] font-extrabold",
              role.className,
            )}
          >
            {role.label}
          </Badge>
        );
      },
    },
    {
      id: "ltv",
      header: "القيمة الزمنية",
      align: "end",
      hideOnMobile: true,
      cell: (c) => (
        <span className="text-[11.5px] text-foreground/55">
          {c.gender ? `${c.gender} · ` : ""}
          {c.birth_date ? new Date(c.birth_date).getFullYear() : "—"}
        </span>
      ),
    },
  ];

  return (
    <>
      <MobileTopbar title="سجل الكيانات" />

      <div className="bg-mesh min-h-screen px-4 pb-12 pt-3 lg:px-6 lg:pt-8">
        <div className="mx-auto max-w-[1400px] space-y-6">
          <SectionHeader
            eyebrow="DIRECTORY · ENTITIES"
            title="سجل الكيانات"
            description="جميع الكيانات السيادية المرتبطة بريف المدينة — عملاء، تجار جملة، حسابات تشغيل."
          />

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:gap-4">
            <GlassKpiCard
              label="إجمالي الكيانات"
              value={fmtNum(stats.total)}
              icon={Users}
              accent="primary"
              loading={customersQ.isLoading}
            />
            <GlassKpiCard
              label="جدد (7 أيام)"
              value={fmtNum(stats.new7)}
              icon={Sparkles}
              accent="info"
              loading={customersQ.isLoading}
            />
            <GlassKpiCard
              label="بأرقام موثّقة"
              value={fmtNum(stats.withPhone)}
              icon={Phone}
              accent="success"
              loading={customersQ.isLoading}
            />
            <GlassKpiCard
              label="تجار جملة"
              value={fmtNum(stats.wholesale)}
              icon={UserCircle2}
              accent="accent"
              loading={customersQ.isLoading}
            />
          </div>

          {/* Search bar */}
          <div className="glass-steel relative flex items-center gap-2 rounded-3xl border border-white/40 px-4 py-2 shadow-soft">
            <Search
              className="h-4 w-4 text-foreground/50"
              strokeWidth={2.4}
            />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="ابحث بالاسم أو رقم الجوال…"
              className="h-10 border-0 bg-transparent text-[13.5px] shadow-none focus-visible:ring-0"
            />
            {q ? (
              <Button
                type="button"
                variant="ghost"
                onClick={() => setQ("")}
                className="h-8 rounded-2xl px-3 text-[11.5px] font-semibold text-foreground/60 hover:bg-white/40"
              >
                مسح
              </Button>
            ) : null}
          </div>

          <GlassTable<CustomerListRow>
            data={filtered}
            columns={columns}
            rowKey={(c) => c.id}
            loading={customersQ.isLoading}
            loadingRows={6}
            onRowClick={(c) => setActiveId(c.id)}
            emptyState={
              <GlassEmptyState
                icon={Users}
                accent="info"
                title="لا توجد كيانات مطابقة"
                description={
                  q
                    ? "لم نعثر على نتائج مطابقة لاستعلامك. جرب اسماً أو رقماً مختلفاً."
                    : "بمجرد ظهور أول عميل في ريف المدينة، سيتم تسجيله هنا تلقائياً."
                }
                actionLabel={q ? "مسح البحث" : undefined}
                onAction={q ? () => setQ("") : undefined}
              />
            }
          />
        </div>
      </div>

      <CustomerDetailDialog
        customerId={activeId}
        onOpenChange={(open) => !open && setActiveId(null)}
        onOpenFullProfile={(id) => {
          setActiveId(null);
          navigate({
            to: "/admin/customers/$customerId",
            params: { customerId: id },
          });
        }}
      />
    </>
  );
}

function CustomerDetailDialog({
  customerId,
  onOpenChange,
  onOpenFullProfile,
}: {
  customerId: string | null;
  onOpenChange: (open: boolean) => void;
  onOpenFullProfile: (id: string) => void;
}) {
  const detail = useQuery({
    queryKey: ["admin", "customers", "360", customerId],
    queryFn: () =>
      getCustomer360Fn({ data: { customerId: customerId as string } }),
    enabled: !!customerId,
    staleTime: 15_000,
  });

  const data = detail.data;

  return (
    <GlassDialog
      open={!!customerId}
      onOpenChange={onOpenChange}
      eyebrow="ENTITY · 360"
      title={data?.profile?.full_name ?? "ملف الكيان"}
      description={data?.profile?.phone ?? undefined}
      size="max-w-2xl"
      footer={
        <>
          <GlassDialogClose asChild>
            <Button
              variant="ghost"
              className="rounded-2xl bg-white/40 text-[12.5px] font-semibold backdrop-blur-md hover:bg-white/60"
            >
              إغلاق
            </Button>
          </GlassDialogClose>
          {customerId ? (
            <Button
              onClick={() => onOpenFullProfile(customerId)}
              className="gap-1.5 rounded-2xl bg-gradient-to-br from-primary to-primary-glow text-[12.5px] font-extrabold text-primary-foreground shadow-elevated hover:opacity-95"
            >
              الملف الكامل
              <ExternalLink className="h-3.5 w-3.5" strokeWidth={2.6} />
            </Button>
          ) : null}
        </>
      }
    >
      {detail.isLoading || !data ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Wallet snapshot */}
          <div className="grid grid-cols-3 gap-2">
            <MiniStat label="الرصيد" value={fmtMoney(data.wallet.balance)} />
            <MiniStat label="نقاط الولاء" value={fmtNum(data.wallet.points)} />
            <MiniStat
              label="إنفاق إجمالي"
              value={fmtMoney(data.stats.total_spent)}
            />
          </div>

          {/* Recent orders */}
          <div className="glass-steel rounded-2xl border border-white/40 p-3">
            <p className="mb-2 text-[10.5px] font-extrabold uppercase tracking-widest text-muted-foreground">
              آخر الطلبات ({fmtNum(data.stats.orders_count)})
            </p>
            {data.orders.length === 0 ? (
              <p className="py-4 text-center text-[12px] text-foreground/55">
                لا توجد طلبات سابقة بعد.
              </p>
            ) : (
              <ul className="divide-y divide-white/40">
                {data.orders.slice(0, 5).map((o) => (
                  <li
                    key={o.id}
                    className="flex items-center justify-between py-2"
                  >
                    <div className="min-w-0">
                      <p className="font-mono text-[11.5px] text-foreground/70">
                        #{o.id.slice(0, 8)}
                      </p>
                      <p className="text-[11px] text-foreground/55">
                        {fmtDate(o.created_at)} · {o.status}
                      </p>
                    </div>
                    <span className="font-display text-[13px] font-extrabold tabular-nums">
                      {fmtMoney(Number(o.total ?? 0))}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </GlassDialog>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass-steel rounded-2xl border border-white/40 p-3 text-center">
      <p className="font-display text-[16px] font-extrabold tabular-nums">
        {value}
      </p>
      <p className="mt-0.5 text-[10.5px] font-semibold text-foreground/55">
        {label}
      </p>
    </div>
  );
}
