import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Package, Clock, TrendingUp, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { UniversalAdminGrid } from "@/components/admin/UniversalAdminGrid";
import { fmtMoney, fmtNum, fmtRelative } from "@/lib/format";
import { cn } from "@/lib/utils";

interface OrderRow {
  id: string;
  status: string;
  total: number;
  payment_method: string | null;
  notes: string | null;
  whatsapp_sent: boolean;
  user_id: string;
  created_at: string;
}

const TABS = [
  { key: "all", label: "الكل" },
  { key: "pending", label: "جديدة" },
  { key: "active", label: "قيد التنفيذ" },
  { key: "delivered", label: "مكتملة" },
  { key: "cancelled", label: "ملغية" },
] as const;

const ACTIVE_STATUSES = ["confirmed", "preparing", "ready", "out_for_delivery", "paid"];

const STATUS_META: Record<string, { label: string; tone: string; dot: string }> = {
  pending:          { label: "بانتظار",     tone: "bg-warning/12 text-warning",         dot: "bg-warning" },
  confirmed:        { label: "مؤكد",        tone: "bg-info/12 text-info",               dot: "bg-info" },
  paid:             { label: "مدفوع",       tone: "bg-success/12 text-success",         dot: "bg-success" },
  preparing:        { label: "قيد التحضير", tone: "bg-[hsl(var(--purple))]/12 text-[hsl(var(--purple))]", dot: "bg-[hsl(var(--purple))]" },
  ready:            { label: "جاهز",        tone: "bg-[hsl(var(--teal))]/12 text-[hsl(var(--teal))]", dot: "bg-[hsl(var(--teal))]" },
  out_for_delivery: { label: "قيد التوصيل", tone: "bg-[hsl(var(--indigo))]/12 text-[hsl(var(--indigo))]", dot: "bg-[hsl(var(--indigo))]" },
  delivered:        { label: "تم التسليم",  tone: "bg-success/12 text-success",         dot: "bg-success" },
  cancelled:        { label: "ملغي",        tone: "bg-destructive/12 text-destructive", dot: "bg-destructive" },
};

const PAYMENT_LABEL: Record<string, string> = {
  cash: "نقدًا",
  card: "بطاقة",
  wallet: "محفظة",
  bank_transfer: "تحويل بنكي",
};

// Quick-action transitions per status (mobile-first one-tap)
const NEXT_STATUS: Record<string, { label: string; to: string }> = {
  pending: { label: "تأكيد", to: "confirmed" },
  confirmed: { label: "بدء التحضير", to: "preparing" },
  preparing: { label: "جاهز", to: "ready" },
  ready: { label: "للتوصيل", to: "out_for_delivery" },
  out_for_delivery: { label: "تم التسليم", to: "delivered" },
};

export default function Orders() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<typeof TABS[number]["key"]>("all");
  const [nonce, setNonce] = useState(0); // bumped on realtime events to remount UAG
  const seenIds = useRef<Set<string>>(new Set());
  const firstLoad = useRef(true);

  // Realtime subscription — force UAG to re-fetch via nonce bump.
  useEffect(() => {
    const channel = supabase
      .channel("admin-orders-list")
      .on(
        // postgres_changes typings differ across versions — narrow safely
        "postgres_changes" as never,
        { event: "INSERT", schema: "public", table: "orders" },
        (payload: { new?: { id?: string } }) => {
          const newId = payload?.new?.id;
          if (newId && !seenIds.current.has(newId) && !firstLoad.current) {
            seenIds.current.add(newId);
            toast.success("طلب جديد وصل 🎉", {
              description: `#${newId.slice(0, 8).toUpperCase()}`,
            });
          }
          setNonce((n) => n + 1);
        },
      )
      .on(
        "postgres_changes" as never,
        { event: "UPDATE", schema: "public", table: "orders" },
        () => setNonce((n) => n + 1),
      )
      .on(
        "postgres_changes" as never,
        { event: "DELETE", schema: "public", table: "orders" },
        () => setNonce((n) => n + 1),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const advanceStatus = async (row: OrderRow) => {
    const next = NEXT_STATUS[row.status];
    if (!next) return;
    const { error } = await supabase.from("orders").update({ status: next.to }).eq("id", row.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`#${row.id.slice(0, 8).toUpperCase()} → ${STATUS_META[next.to]?.label ?? next.to}`);
    setNonce((n) => n + 1);
  };

  const cancelOrder = async (row: OrderRow) => {
    const { error } = await supabase.from("orders").update({ status: "cancelled" }).eq("id", row.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`تم إلغاء #${row.id.slice(0, 8).toUpperCase()}`);
    setNonce((n) => n + 1);
  };

  const fetcher = async (): Promise<OrderRow[]> => {
    const { data } = await supabase
      .from("orders")
      .select("id,status,total,payment_method,notes,whatsapp_sent,user_id,created_at")
      .order("created_at", { ascending: false })
      .limit(500);
    const rows = (data ?? []) as OrderRow[];
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
    <UniversalAdminGrid<OrderRow>
      key={`${tab}-${nonce}`}
      title="الطلبات"
      subtitle="مراقبة الطلبات الحية والتحكم بالحالات بضغطة واحدة"
      dataSource={{
        fetcher,
        searchKeys: ["id", "notes"],
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
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  "px-4 h-8 rounded-full text-[12.5px] font-semibold whitespace-nowrap transition-base press",
                  tab === t.key ? "bg-surface text-foreground shadow-sm" : "text-foreground-secondary",
                )}
              >
                {t.label}
              </button>
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
                  {r.whatsapp_sent && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-success/10 text-success">
                      WA ✓
                    </span>
                  )}
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
                  {r.payment_method && <span>• {PAYMENT_LABEL[r.payment_method] ?? r.payment_method}</span>}
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
          label: "تقدم",
          tone: "success",
          icon: CheckCircle2,
          onClick: (r) => advanceStatus(r),
        },
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
