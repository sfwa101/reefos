/**
 * Admin Master Orders Hub — WAVE UI-11 (Steel Glass overhaul).
 *
 * UI rebuilt with the Sovereign Glass Arsenal (SectionHeader, GlassKpiCard,
 * GlassTable, GlassEmptyState, GlassDialog). Data flow is unchanged: every
 * row still resolves through `listMasterOrdersFn` and mutations go through
 * `setOrderStatusFn`. Realtime invalidation continues to come from
 * `useAdminOrdersRealtime`.
 */
import { useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  Package,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { SectionHeader } from "@/components/admin/ui/SectionHeader";
import { GlassKpiCard } from "@/components/admin/ui/GlassKpiCard";
import { GlassTable, type GlassTableColumn } from "@/components/admin/ui/GlassTable";
import { GlassEmptyState } from "@/components/admin/ui/GlassEmptyState";
import { GlassDialog, GlassDialogClose } from "@/components/admin/ui/GlassDialog";
import { Button } from "@/components/ui/button";
import { fmtMoney, fmtNum, fmtRelative } from "@/lib/format";
import { cn } from "@/lib/utils";
import { listMasterOrdersFn, setOrderStatusFn } from "@/core/ops/ops.functions";
import { useAdminOrdersRealtime } from "@/core/events/hooks/useAdminOrdersRealtime";
import { Tracer } from "@/core/system/observability/Tracer";

interface MasterOrderRow {
  id: string;
  status: string;
  total: number;
  customer_id: string;
  customer_name: string | null;
  customer_phone: string | null;
  node_count: number;
  created_at: string;
}

const TABS = [
  { key: "all", label: "الكل" },
  { key: "pending", label: "جديدة" },
  { key: "active", label: "قيد التنفيذ" },
  { key: "delivered", label: "مكتملة" },
  { key: "cancelled", label: "ملغية" },
] as const;

const ACTIVE_STATUSES = [
  "confirmed",
  "preparing",
  "ready",
  "out_for_delivery",
  "paid",
  "assigned",
  "picked_up",
];

const STATUS_META: Record<string, { label: string; tone: string; dot: string }> = {
  pending:          { label: "بانتظار",     tone: "bg-amber-500/15 text-amber-700",   dot: "bg-amber-500" },
  confirmed:        { label: "مؤكد",        tone: "bg-sky-500/15 text-sky-700",       dot: "bg-sky-500" },
  paid:             { label: "مدفوع",       tone: "bg-emerald-500/15 text-emerald-700", dot: "bg-emerald-500" },
  preparing:        { label: "قيد التحضير", tone: "bg-violet-500/15 text-violet-700", dot: "bg-violet-500" },
  ready:            { label: "جاهز",        tone: "bg-teal-500/15 text-teal-700",     dot: "bg-teal-500" },
  assigned:         { label: "مُسند",       tone: "bg-sky-500/15 text-sky-700",       dot: "bg-sky-500" },
  picked_up:        { label: "تم الالتقاط", tone: "bg-indigo-500/15 text-indigo-700", dot: "bg-indigo-500" },
  out_for_delivery: { label: "قيد التوصيل", tone: "bg-indigo-500/15 text-indigo-700", dot: "bg-indigo-500" },
  delivered:        { label: "تم التسليم",  tone: "bg-emerald-500/15 text-emerald-700", dot: "bg-emerald-500" },
  cancelled:        { label: "ملغي",        tone: "bg-rose-500/15 text-rose-700",     dot: "bg-rose-500" },
};

const STATUS_PRIORITY = [
  "pending", "confirmed", "paid", "preparing", "ready",
  "assigned", "picked_up", "out_for_delivery", "delivered", "cancelled",
];
function aggregateStatus(nodeStatuses: string[]): string {
  if (!nodeStatuses.length) return "pending";
  if (nodeStatuses.every((s) => s === "delivered")) return "delivered";
  if (nodeStatuses.every((s) => s === "cancelled")) return "cancelled";
  const active = nodeStatuses.filter((s) => s !== "delivered" && s !== "cancelled");
  const pool = active.length ? active : nodeStatuses;
  return pool.reduce(
    (lo, s) => (STATUS_PRIORITY.indexOf(s) < STATUS_PRIORITY.indexOf(lo) ? s : lo),
    pool[0],
  );
}

function StatusChip({ status }: { status: string }) {
  const meta =
    STATUS_META[status] ?? {
      label: status,
      tone: "bg-muted text-muted-foreground",
      dot: "bg-muted-foreground",
    };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-extrabold whitespace-nowrap",
        meta.tone,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
      {meta.label}
    </span>
  );
}

export default function Orders() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<typeof TABS[number]["key"]>("all");
  const [selected, setSelected] = useState<MasterOrderRow | null>(null);
  const seenIds = useRef<Set<string>>(new Set());
  const firstLoad = useRef(true);

  const query = useQuery<MasterOrderRow[]>({
    queryKey: ["admin", "orders", "master"],
    queryFn: async () => {
      let raw;
      try {
        raw = await listMasterOrdersFn();
      } catch (e) {
        Tracer.error("admin", "admin_orders_fetch_failed", {
          args: ["[admin/orders] fetch failed:", (e as Error).message],
        });
        toast.error(`تعذر جلب الطلبات: ${(e as Error).message}`);
        return [];
      }
      const rows: MasterOrderRow[] = raw.map((m) => ({
        id: m.id,
        status: aggregateStatus(m.node_statuses),
        total: Number(m.total_amount ?? 0),
        customer_id: m.customer_id,
        customer_name: m.customer_name,
        customer_phone: m.customer_phone,
        node_count: m.node_statuses.length,
        created_at: m.created_at,
      }));
      if (firstLoad.current) {
        rows.forEach((o) => seenIds.current.add(o.id));
        firstLoad.current = false;
      }
      return rows;
    },
  });

  useAdminOrdersRealtime({
    onInsert: (newId) => {
      if (!seenIds.current.has(newId) && !firstLoad.current) {
        seenIds.current.add(newId);
        toast.success("طلب جديد وصل 🎉", {
          description: `#${newId.slice(0, 8).toUpperCase()}`,
        });
      }
    },
    onChange: () => query.refetch(),
  });

  const allRows = query.data ?? [];
  const filtered = useMemo(() => {
    if (tab === "pending") return allRows.filter((o) => o.status === "pending");
    if (tab === "active") return allRows.filter((o) => ACTIVE_STATUSES.includes(o.status));
    if (tab === "delivered") return allRows.filter((o) => o.status === "delivered");
    if (tab === "cancelled") return allRows.filter((o) => o.status === "cancelled");
    return allRows;
  }, [allRows, tab]);

  const cancelOrder = async (row: MasterOrderRow) => {
    try {
      await setOrderStatusFn({ data: { orderId: row.id, status: "cancelled" } });
      toast.success(`تم إلغاء #${row.id.slice(0, 8).toUpperCase()}`);
      setSelected(null);
      query.refetch();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const exportCsv = () => {
    const header = ["id", "status", "total", "customer", "phone", "nodes", "created_at"];
    const lines = filtered.map((r) =>
      [
        r.id,
        r.status,
        r.total,
        r.customer_name ?? "",
        r.customer_phone ?? "",
        r.node_count,
        r.created_at,
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(","),
    );
    const blob = new Blob([[header.join(","), ...lines].join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const columns: GlassTableColumn<MasterOrderRow>[] = [
    {
      id: "id",
      header: "الطلب",
      cell: (r) => (
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-display font-mono text-[13px] font-extrabold tracking-tight">
              #{r.id.slice(0, 8).toUpperCase()}
            </span>
            <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
              {r.node_count} عُقد
            </span>
          </div>
          <div className="mt-0.5 text-[11px] text-muted-foreground">
            {fmtRelative(r.created_at)}
          </div>
        </div>
      ),
    },
    {
      id: "customer",
      header: "العميل",
      hideOnMobile: true,
      cell: (r) => (
        <div className="min-w-0">
          <div className="truncate font-semibold text-foreground/90">
            {r.customer_name ?? "—"}
          </div>
          {r.customer_phone && (
            <div className="font-mono text-[11px] text-muted-foreground">
              {r.customer_phone}
            </div>
          )}
        </div>
      ),
    },
    {
      id: "status",
      header: "الحالة",
      cell: (r) => <StatusChip status={r.status} />,
    },
    {
      id: "total",
      header: "الإجمالي",
      align: "end",
      width: "w-32",
      cell: (r) => (
        <span className="font-display text-[13.5px] font-extrabold tracking-tight">
          {fmtMoney(r.total)}
        </span>
      ),
    },
  ];

  const selectedMeta = selected
    ? STATUS_META[selected.status] ?? { label: selected.status, tone: "", dot: "" }
    : null;

  return (
    <div className="px-4 py-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <SectionHeader
          eyebrow="ريف المدينة · ERP"
          title="سجل الطلبات السيادية"
          description="إدارة ومتابعة طلبات السيد (Master Orders) المُجمَّعة من عُقد التنفيذ الحيّة."
          action={
            <Button
              type="button"
              onClick={exportCsv}
              disabled={!filtered.length}
              className="rounded-2xl border border-white/40 bg-white/40 px-4 text-[12.5px] font-extrabold text-foreground backdrop-blur-md hover:bg-white/60"
            >
              <Download className="me-2 h-4 w-4" strokeWidth={2.4} />
              تصدير
            </Button>
          }
        />

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <GlassKpiCard
            label="إجمالي الطلبات"
            value={fmtNum(allRows.length)}
            icon={Package}
            accent="primary"
            loading={query.isLoading}
          />
          <GlassKpiCard
            label="بانتظار التأكيد"
            value={fmtNum(allRows.filter((r) => r.status === "pending").length)}
            icon={Clock}
            accent="warning"
            loading={query.isLoading}
          />
          <GlassKpiCard
            label="قيد التنفيذ"
            value={fmtNum(
              allRows.filter((r) => ACTIVE_STATUSES.includes(r.status)).length,
            )}
            icon={TrendingUp}
            accent="info"
            loading={query.isLoading}
          />
          <GlassKpiCard
            label="إجمالي القيمة"
            value={fmtMoney(allRows.reduce((s, r) => s + (r.total ?? 0), 0))}
            icon={CheckCircle2}
            accent="success"
            loading={query.isLoading}
          />
        </div>

        <div className="-mx-4 overflow-x-auto px-4">
          <div className="glass-steel inline-flex gap-1 rounded-full border border-white/40 p-1">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={cn(
                  "h-8 whitespace-nowrap rounded-full px-4 text-[12.5px] font-extrabold transition",
                  tab === t.key
                    ? "bg-white/80 text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <GlassTable<MasterOrderRow>
          data={filtered}
          columns={columns}
          rowKey={(r) => r.id}
          loading={query.isLoading}
          onRowClick={(r) => setSelected(r)}
          emptyState={
            <GlassEmptyState
              icon={Package}
              accent="info"
              title="لا توجد طلبات نشطة حالياً"
              description="لم نعثر على طلبات تطابق التصفية الحالية. جرّب تبويباً آخر أو انتظر الطلبات الجديدة."
            />
          }
        />
      </div>

      <GlassDialog
        open={!!selected}
        onOpenChange={(open) => !open && setSelected(null)}
        eyebrow={selectedMeta?.label}
        title={
          selected
            ? `طلب #${selected.id.slice(0, 8).toUpperCase()}`
            : undefined
        }
        description={
          selected
            ? `${selected.node_count} عُقد تنفيذ · ${fmtRelative(selected.created_at)}`
            : undefined
        }
        size="max-w-md"
        footer={
          selected ? (
            <>
              <Button
                type="button"
                variant="ghost"
                onClick={() => cancelOrder(selected)}
                className="rounded-2xl text-rose-600 hover:bg-rose-500/10"
              >
                <XCircle className="me-1.5 h-4 w-4" strokeWidth={2.4} />
                إلغاء الطلب
              </Button>
              <GlassDialogClose asChild>
                <Button
                  type="button"
                  onClick={() =>
                    navigate({
                      to: "/admin/orders/$orderId",
                      params: { orderId: selected.id },
                    })
                  }
                  className="rounded-2xl bg-gradient-to-br from-primary to-primary-glow px-4 font-extrabold text-primary-foreground shadow-elevated hover:opacity-95"
                >
                  فتح التفاصيل
                  <ExternalLink className="ms-1.5 h-4 w-4" strokeWidth={2.4} />
                </Button>
              </GlassDialogClose>
            </>
          ) : null
        }
      >
        {selected && (
          <div className="space-y-3 text-[13px]">
            <div className="flex items-center justify-between rounded-2xl border border-white/40 bg-white/40 p-3 backdrop-blur-md">
              <span className="text-muted-foreground">الإجمالي</span>
              <span className="font-display text-lg font-extrabold tracking-tight">
                {fmtMoney(selected.total)}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/40 bg-white/40 p-3 backdrop-blur-md">
                <p className="text-[10.5px] font-extrabold uppercase tracking-widest text-muted-foreground">
                  العميل
                </p>
                <p className="mt-1 truncate font-bold">
                  {selected.customer_name ?? "—"}
                </p>
              </div>
              <div className="rounded-2xl border border-white/40 bg-white/40 p-3 backdrop-blur-md">
                <p className="text-[10.5px] font-extrabold uppercase tracking-widest text-muted-foreground">
                  الجوال
                </p>
                <p className="mt-1 truncate font-mono font-bold">
                  {selected.customer_phone ?? "—"}
                </p>
              </div>
            </div>
            <div className="rounded-2xl border border-white/40 bg-white/40 p-3 backdrop-blur-md">
              <p className="text-[10.5px] font-extrabold uppercase tracking-widest text-muted-foreground">
                حالة التنفيذ
              </p>
              <div className="mt-2">
                <StatusChip status={selected.status} />
              </div>
            </div>
          </div>
        )}
      </GlassDialog>
    </div>
  );
}
