/**
 * Admin OrderDetail — Sovereign Matrix Edition (Phase 14 Part 3)
 *
 * Reads from `salsabil_master_orders` → `salsabil_fulfillment_nodes`
 * → `salsabil_fulfillment_items` → `salsabil_skus` → `salsabil_assets`.
 *
 * Status mutations cascade to all child nodes of the master order.
 * Driver assignment writes `driver_id` to all nodes simultaneously.
 *
 * The legacy `addresses` lookup is replaced by reading the snapshot stored
 * in `master_orders.delivery_info` (already captured at checkout time).
 */
import { useEffect, useState } from "react";
import { useParams, useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronRight, MapPin, Package, User, Truck, X, CheckCircle2 } from "lucide-react";
import { IOSCard, IOSList, IOSRow, IOSSection } from "@/components/ios/IOSCard";
import { fmtMoney, fmtDate } from "@/lib/format";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  getMasterOrderDetailFn,
  setOrderStatusFn,
  listActiveDriversFn,
  assignDriverToOrderFn,
} from "@/core/ops/ops.functions";

const FLOW = [
  { value: "pending", label: "بانتظار" },
  { value: "confirmed", label: "مؤكد" },
  { value: "preparing", label: "قيد التحضير" },
  { value: "ready", label: "جاهز" },
  { value: "out_for_delivery", label: "قيد التوصيل" },
  { value: "delivered", label: "تم التسليم" },
];

const statusBadge: Record<string, string> = {
  pending: "bg-warning/12 text-warning",
  confirmed: "bg-info/12 text-info",
  preparing: "bg-[hsl(var(--purple))]/12 text-[hsl(var(--purple))]",
  ready: "bg-[hsl(var(--teal))]/12 text-[hsl(var(--teal))]",
  out_for_delivery: "bg-[hsl(var(--indigo))]/12 text-[hsl(var(--indigo))]",
  delivered: "bg-success/12 text-success",
  cancelled: "bg-destructive/12 text-destructive",
  paid: "bg-success/12 text-success",
};

const STATUS_PRIORITY = [
  "pending", "confirmed", "paid", "preparing", "ready",
  "assigned", "picked_up", "out_for_delivery", "delivered", "cancelled",
];
function aggregateStatus(statuses: string[], fallback: string): string {
  if (!statuses.length) return fallback;
  if (statuses.every((s) => s === "delivered")) return "delivered";
  if (statuses.every((s) => s === "cancelled")) return "cancelled";
  const active = statuses.filter((s) => s !== "delivered" && s !== "cancelled");
  const pool = active.length ? active : statuses;
  return pool.reduce((lo, s) =>
    STATUS_PRIORITY.indexOf(s) < STATUS_PRIORITY.indexOf(lo) ? s : lo
  , pool[0]);
}

function invalidateOrderCaches(qc: ReturnType<typeof useQueryClient>) {
  ["orders", "admin-orders", "dashboard", "dashboard-stats", "finance", "finance-metrics", "delivery-tasks", "hakim-pulse"].forEach((k) =>
    qc.invalidateQueries({ queryKey: [k] }),
  );
}

interface MasterOrder {
  id: string;
  total: number;
  status: string;            // aggregated headline
  created_at: string;
  customer_id: string;
  payment_method: string | null;
  notes: string | null;
  delivery_info: Record<string, unknown> | null;
  node_ids: string[];
}

interface ItemRow {
  id: string;
  quantity: number;
  price: number;
  product_name: string;
  product_image: string | null;
}

interface CustomerLite { full_name: string | null; phone: string | null }

export default function OrderDetail() {
  const { orderId } = useParams({ strict: false }) as { orderId: string };
  const router = useRouter();
  const qc = useQueryClient();
  const [order, setOrder] = useState<MasterOrder | null>(null);
  const [items, setItems] = useState<ItemRow[]>([]);
  const [customer, setCustomer] = useState<CustomerLite | null>(null);
  const [updating, setUpdating] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  type AdminDriver = { id: string; full_name: string | null; phone: string | null };
  const [drivers, setDrivers] = useState<AdminDriver[]>([]);

  useEffect(() => {
    if (!orderId) return;
    (async () => {
      let detail;
      try {
        detail = await getMasterOrderDetailFn({ data: { orderId } });
      } catch {
        setOrder(null);
        return;
      }
      if (!detail) { setOrder(null); return; }

      const di = (detail.delivery_info ?? {}) as Record<string, unknown> & { notes?: string; payment_method?: string };
      const notes = detail.node_notes.join(" • ") || (di.notes ?? null);

      setOrder({
        id: detail.id,
        total: Number(detail.total_amount ?? 0),
        status: aggregateStatus(detail.node_statuses, detail.status ?? "pending"),
        created_at: detail.created_at,
        customer_id: detail.customer_id,
        payment_method: di.payment_method ?? null,
        notes,
        delivery_info: detail.delivery_info,
        node_ids: detail.node_ids,
      });
      setItems(detail.items);
      setCustomer(detail.customer);
    })();
  }, [orderId]);

  async function setStatus(next: string) {
    if (!order) return;
    setUpdating(true);
    try {
      await setOrderStatusFn({ data: { orderId: order.id, status: next } });
      setOrder({ ...order, status: next });
      invalidateOrderCaches(qc);
      toast.success("تم تحديث حالة الطلب");
    } catch {
      toast.error("تعذّر تحديث الحالة");
    } finally {
      setUpdating(false);
    }
  }

  async function openAssignDriver() {
    setShowAssign(true);
    if (drivers.length === 0) {
      try {
        const list = await listActiveDriversFn();
        setDrivers(list);
      } catch {
        setDrivers([]);
      }
    }
  }

  async function confirmAndAssign(driverId: string, driverName: string) {
    if (!order) return;
    setUpdating(true);
    try {
      await assignDriverToOrderFn({ data: { nodeIds: order.node_ids, driverId } });
      setOrder({ ...order, status: "out_for_delivery" });
      setShowAssign(false);
      invalidateOrderCaches(qc);
      toast.success(`تم التعيين إلى ${driverName}`);
    } catch {
      toast.error("تعذّر تعيين المندوب");
    } finally {
      setUpdating(false);
    }
  }

  if (!order) {
    return (
      <>
        <Topbar title="جاري التحميل…" onBack={() => router.history.back()} />
        <div className="p-4 max-w-2xl mx-auto space-y-3">
          <div className="h-32 rounded-3xl bg-surface-muted animate-pulse" />
          <div className="h-48 rounded-3xl bg-surface-muted animate-pulse" />
        </div>
      </>
    );
  }

  const idx = FLOW.findIndex(s => s.value === order.status);
  const next = idx >= 0 && idx < FLOW.length - 1 ? FLOW[idx + 1] : null;
  const canAssignDriver = ["pending", "confirmed", "preparing", "ready"].includes(order.status);
  const addr = (order.delivery_info ?? {}) as { city?: string; district?: string; street?: string; building?: string; label?: string };
  const addressLine = [addr.city, addr.district, addr.street, addr.building].filter(Boolean).join(" - ");

  return (
    <>
      <Topbar title={`#${String(order.id).slice(0, 8).toUpperCase()}`} onBack={() => router.history.back()} />
      <div className="px-4 lg:px-6 pt-3 pb-8 max-w-2xl mx-auto space-y-4">
        <IOSCard className="bg-gradient-primary text-primary-foreground border-0">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-[12px] opacity-80">الإجمالي</p>
              <p className="font-display text-[34px] leading-none num tracking-tight mt-1">{fmtMoney(order.total)}</p>
            </div>
            <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full bg-primary-foreground/20")}>{order.payment_method ?? "—"}</span>
          </div>
          <div className="text-[12.5px] opacity-90">{fmtDate(order.created_at)}</div>
        </IOSCard>

        <IOSCard>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[13px] text-foreground-secondary">الحالة الحالية</span>
            <span className={cn("text-[12px] font-semibold px-2.5 py-1 rounded-full", statusBadge[order.status] ?? "bg-muted")}>
              {FLOW.find(s => s.value === order.status)?.label ?? order.status}
            </span>
          </div>

          <div className="space-y-2">
            {canAssignDriver && (
              <button disabled={updating} onClick={openAssignDriver}
                className="w-full h-11 rounded-full bg-gradient-to-r from-primary to-primary-glow text-primary-foreground font-semibold text-[14px] press disabled:opacity-50 flex items-center justify-center gap-2">
                <Truck className="h-4 w-4" /> تأكيد وتعيين مندوب
              </button>
            )}
            {next && (
              <button disabled={updating} onClick={() => setStatus(next.value)}
                className="w-full h-11 rounded-full bg-surface-muted text-foreground font-semibold text-[14px] press disabled:opacity-50 flex items-center justify-center gap-2">
                <CheckCircle2 className="h-4 w-4" /> تحويل إلى: {next.label}
              </button>
            )}
            {!["cancelled", "delivered"].includes(order.status) && (
              <button disabled={updating} onClick={() => setStatus("cancelled")}
                className="w-full h-11 rounded-full bg-destructive/10 text-destructive font-semibold text-[14px] press">
                إلغاء الطلب
              </button>
            )}
          </div>
        </IOSCard>

        {customer && (
          <IOSSection title="العميل">
            <IOSList>
              <IOSRow>
                <User className="h-4 w-4 text-foreground-tertiary" />
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-medium">{customer.full_name ?? "بدون اسم"}</p>
                  {customer.phone && <p className="text-[12px] text-foreground-tertiary num" dir="ltr">{customer.phone}</p>}
                </div>
              </IOSRow>
            </IOSList>
          </IOSSection>
        )}

        <IOSSection title={`العناصر (${items.length})`}>
          {items.length === 0 ? (
            <IOSCard className="text-center text-[13px] text-foreground-secondary">لا توجد عناصر مفصّلة</IOSCard>
          ) : (
            <IOSList>
              {items.map(it => (
                <IOSRow key={it.id}>
                  <div className="h-10 w-10 rounded-xl bg-surface-muted flex items-center justify-center overflow-hidden">
                    {it.product_image ? <img src={it.product_image} alt="" className="w-full h-full object-cover" />
                      : <Package className="h-4 w-4 text-foreground-tertiary" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-medium truncate">{it.product_name}</p>
                    <p className="text-[11.5px] text-foreground-tertiary num">{it.quantity} × {fmtMoney(it.price)}</p>
                  </div>
                  <span className="font-display text-[14px] num">{fmtMoney(it.price * it.quantity)}</span>
                </IOSRow>
              ))}
            </IOSList>
          )}
        </IOSSection>

        {addressLine && (
          <IOSSection title="عنوان التوصيل">
            <IOSList>
              <IOSRow>
                <MapPin className="h-4 w-4 text-foreground-tertiary" />
                <div className="flex-1 min-w-0">
                  <p className="text-[14px]">{addr.label ?? "العنوان"}</p>
                  <p className="text-[12px] text-foreground-tertiary">{addressLine}</p>
                </div>
              </IOSRow>
            </IOSList>
          </IOSSection>
        )}

        {order.notes && (
          <IOSSection title="ملاحظات">
            <IOSCard><p className="text-[13.5px]">{order.notes}</p></IOSCard>
          </IOSSection>
        )}
      </div>

      {showAssign && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50" onClick={() => setShowAssign(false)}>
          <div className="w-full sm:max-w-md rounded-t-[24px] sm:rounded-[24px] bg-card p-5 shadow-float ring-1 ring-border/40" onClick={(e) => e.stopPropagation()} dir="rtl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-extrabold">اختر مندوب التوصيل</h2>
              <button onClick={() => setShowAssign(false)} className="h-9 w-9 rounded-[10px] bg-foreground/5 flex items-center justify-center"><X className="h-4 w-4" /></button>
            </div>
            <p className="text-[12px] text-foreground-tertiary mb-3">سيتم تعيين المندوب لكل عُقد التنفيذ التابعة لهذا الطلب وتحويل الحالة إلى "قيد التوصيل".</p>
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {drivers.length === 0 && (
                <p className="text-center text-[13px] text-foreground-tertiary py-8">لا يوجد مناديب متاحون حالياً</p>
              )}
              {drivers.map((d) => (
                <button
                  key={d.id}
                  disabled={updating}
                  onClick={() => confirmAndAssign(d.id, d.full_name ?? "مندوب")}
                  className="w-full text-right p-3 rounded-2xl bg-surface-muted hover:bg-primary/10 transition flex items-center justify-between disabled:opacity-50"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-full bg-primary/12 text-primary flex items-center justify-center">
                      <Truck className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13.5px] font-semibold truncate">{d.full_name ?? "مندوب"}</p>
                      {d.phone && <p className="text-[11.5px] text-foreground-tertiary num" dir="ltr">{d.phone}</p>}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-foreground-tertiary rotate-180" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Topbar({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <header className="glass-strong sticky top-0 z-30 border-b border-border/40" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      <div className="px-2 h-12 flex items-center gap-1">
        <button onClick={onBack} className="h-9 w-9 rounded-full hover:bg-surface-muted press flex items-center justify-center">
          <ChevronRight className="h-5 w-5" />
        </button>
        <h1 className="font-display text-[17px] flex-1 text-center pr-9 truncate">{title}</h1>
      </div>
    </header>
  );
}
