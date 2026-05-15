/**
 * Admin Master Orders Hub — Phase 14 Part 2
 *
 * Sovereign Migration: This page no longer reads from the legacy `public.orders`
 * table. It is now bound directly to `salsabil_master_orders` joined with
 * `salsabil_fulfillment_nodes` and the customer `profiles` table.
 *
 * The aggregated status of a master order is derived from its fulfillment
 * nodes (vendor-level fulfillment units) using the same priority ladder used
 * across the customer Account view.
 */
import { useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Package, Clock, TrendingUp, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { UniversalAdminGrid } from "@/components/admin/UniversalAdminGrid";
import { fmtMoney, fmtNum, fmtRelative } from "@/lib/format";
import { cn } from "@/lib/utils";
import { listMasterOrdersFn, setOrderStatusFn } from "@/core/ops/ops.functions";
import { useAdminOrdersRealtime } from "@/core/events/hooks/useAdminOrdersRealtime";
import { Tracer } from "@/core/system/observability/Tracer";
import { Button } from "@/components/ui/button";

interface MasterOrderRow {
  id: string;
  status: string;          // aggregated headline status
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

const ACTIVE_STATUSES = ["confirmed", "preparing", "ready", "out_for_delivery", "paid", "assigned", "picked_up"];

const STATUS_META: Record<string, { label: string; tone: string; dot: string }> = {
  pending:          { label: "بانتظار",     tone: "bg-warning/12 text-warning",         dot: "bg-warning" },
  confirmed:        { label: "مؤكد",        tone: "bg-info/12 text-info",               dot: "bg-info" },
  paid:             { label: "مدفوع",       tone: "bg-success/12 text-success",         dot: "bg-success" },
  preparing:        { label: "قيد التحضير", tone: "bg-[hsl(var(--purple))]/12 text-[hsl(var(--purple))]", dot: "bg-[hsl(var(--purple))]" },
  ready:            { label: "جاهز",        tone: "bg-[hsl(var(--teal))]/12 text-[hsl(var(--teal))]", dot: "bg-[hsl(var(--teal))]" },
  assigned:         { label: "مُسند",       tone: "bg-info/12 text-info",               dot: "bg-info" },
  picked_up:        { label: "تم الالتقاط", tone: "bg-[hsl(var(--indigo))]/12 text-[hsl(var(--indigo))]", dot: "bg-[hsl(var(--indigo))]" },
  out_for_delivery: { label: "قيد التوصيل", tone: "bg-[hsl(var(--indigo))]/12 text-[hsl(var(--indigo))]", dot: "bg-[hsl(var(--indigo))]" },
  delivered:        { label: "تم التسليم",  tone: "bg-success/12 text-success",         dot: "bg-success" },
  cancelled:        { label: "ملغي",        tone: "bg-destructive/12 text-destructive", dot: "bg-destructive" },
};

// Priority ladder for aggregating multi-node status into a single headline.
const STATUS_PRIORITY = [
  "pending", "confirmed", "paid", "preparing", "ready",
  "assigned", "picked_up", "out_for_delivery", "delivered", "cancelled",
];
function aggregateStatus(nodeStatuses: string[]): string {
  if (!nodeStatuses.length) return "pending";
  if (nodeStatuses.every((s) => s === "delivered")) return "delivered";
  if (nodeStatuses.every((s) => s === "cancelled")) return "cancelled";
  // Headline = lowest still-active stage (earliest in pipeline among non-delivered nodes).
  const active = nodeStatuses.filter((s) => s !== "delivered" && s !== "cancelled");
  const pool = active.length ? active : nodeStatuses;
  return pool.reduce((lo, s) =>
    STATUS_PRIORITY.indexOf(s) < STATUS_PRIORITY.indexOf(lo) ? s : lo
  , pool[0]);
}

export default function Orders() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<typeof TABS[number]["key"]>("all");
  const [nonce, setNonce] = useState(0);
  const seenIds = useRef<Set<string>>(new Set());
  const firstLoad = useRef(true);

  // Realtime — listen to Sovereign Matrix tables via dedicated hook.
  useAdminOrdersRealtime({
    onInsert: (newId) => {
      if (!seenIds.current.has(newId) && !firstLoad.current) {
        seenIds.current.add(newId);
        toast.success("طلب جديد وصل 🎉", {
          description: `#${newId.slice(0, 8).toUpperCase()}`,
        });
      }
    },
    onChange: () => setNonce((n) => n + 1),
  });

  // Phase 37 — atomic admin server fn; no direct table writes from the browser.
  const cancelOrder = async (row: MasterOrderRow) => {
    try {
      await setOrderStatusFn({ data: { orderId: row.id, status: "cancelled" } });
      toast.success(`تم إلغاء #${row.id.slice(0, 8).toUpperCase()}`);
      setNonce((n) => n + 1);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const fetcher = async (): Promise<MasterOrderRow[]> => {
    let raw;
    try {
      raw = await listMasterOrdersFn();
    } catch (e) {
      Tracer.error("admin", "admin_orders_fetch_failed", { args: ["[admin/orders] fetch failed:", (e as Error).message] });
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
    if (tab === "pending") return rows.filter((o) => o.status === "pending");
    if (tab === "active") return rows.filter((o) => ACTIVE_STATUSES.includes(o.status));
    if (tab === "delivered") return rows.filter((o) => o.status === "delivered");
    if (tab === "cancelled") return rows.filter((o) => o.status === "cancelled");
    return rows;
  };

  return (
    <UniversalAdminGrid<MasterOrderRow>
      key={`${tab}-${nonce}`}
      title="الطلبات السيادية"
      subtitle="مراقبة طلبات السيد (Master Orders) المُجمَّعة من عُقد التنفيذ الحيّة"
      dataSource={{
        fetcher,
        searchKeys: ["id", "customer_name", "customer_phone"],
      }}
      metrics={[
        {
          key: "all",
          label: "إجمالي الطلبات",
          icon: Package,
          tone: "primary",
          compute: (rows) => fmtNum(rows.length),
        },
        {
          key: "pending",
          label: "بانتظار التأكيد",
          icon: Clock,
          tone: "warning",
          compute: (rows) => fmtNum(rows.filter((r) => r.status === "pending").length),
          urgent: (rows) => rows.some((r) => r.status === "pending"),
        },
        {
          key: "active",
          label: "قيد التنفيذ",
          icon: TrendingUp,
          tone: "info",
          compute: (rows) => fmtNum(rows.filter((r) => ACTIVE_STATUSES.includes(r.status)).length),
        },
        {
          key: "revenue",
          label: "إجمالي القيمة",
          icon: CheckCircle2,
          tone: "success",
          compute: (rows) => fmtMoney(rows.reduce((s, r) => s + (r.total ?? 0), 0)),
        },
      ]}
      topSlot={
        <div className="overflow-x-auto -mx-4 px-4 no-scrollbar">
          <div className="inline-flex gap-1.5 bg-surface-muted rounded-full p-1">
            {TABS.map((t) => (
              <Button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  "px-4 h-8 rounded-full text-[12.5px] font-semibold whitespace-nowrap transition-base press",
                  tab === t.key ? "bg-surface text-foreground shadow-sm" : "text-foreground-secondary",
                )}
              >
                {t.label}
              </Button>
            ))}
          </div>
        </div>
      }
      columns={[
        {
          key: "id",
          className: "flex-1 min-w-0",
          render: (r) => {
            const meta = STATUS_META[r.status] ?? {
              label: r.status,
              tone: "bg-muted text-foreground-secondary",
              dot: "bg-muted-foreground",
            };
            return (
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-display text-[13.5px] font-mono num">
                    #{r.id.slice(0, 8).toUpperCase()}
                  </span>
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                    {r.node_count} عُقد
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-[11px] text-foreground-tertiary">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full font-semibold whitespace-nowrap text-[10.5px] px-1.5 py-0.5",
                      meta.tone,
                    )}
                  >
                    <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
                    {meta.label}
                  </span>
                  {r.customer_name && <span className="truncate max-w-[140px]">• {r.customer_name}</span>}
                  <span className="hidden sm:inline">• {fmtRelative(r.created_at)}</span>
                </div>
              </div>
            );
          },
        },
        {
          key: "total",
          className: "shrink-0 text-left",
          render: (r) => <span className="font-display text-[14px] num">{fmtMoney(r.total)}</span>,
        },
      ]}
      onRowClick={(r) => navigate({ to: "/admin/orders/$orderId", params: { orderId: r.id } })}
      rowActions={[
        {
          label: "إلغاء",
          tone: "destructive",
          icon: XCircle,
          onClick: (r) => cancelOrder(r),
        },
      ]}
      empty={{
        icon: Package,
        title: "لا توجد طلبات",
        hint: "لم نعثر على طلبات تطابق التصفية الحالية.",
      }}
    />
  );
}
