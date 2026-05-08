/**
 * VendorOrders — Phase 9 Part 4.
 * Tenant-isolated slice of master orders. Vendor sees only their own fulfillment nodes.
 */
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Package, CheckCircle2, Clock, Eye, PackageCheck, MapPin, Phone, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentVendor } from "@/core-os/hakim-ai/hooks/useCurrentVendor";
import { useUpdateFulfillmentStatus, type FulfillmentStatus } from "@/core-os/hakim-ai/hooks/useFulfillmentNodes";
import { UniversalAdminGrid, type Column, type RowAction, type BentoMetric } from "@/components/admin/UniversalAdminGrid";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { fmtMoney, fmtNum } from "@/lib/format";

interface DeliverySnapshot {
  recipient_name?: string;
  customer_name?: string;
  name?: string;
  phone?: string;
  address_label?: string;
  label?: string;
  city?: string;
  zone?: string;
  street?: string;
  building?: string;
  floor?: string;
  apartment?: string;
  notes?: string;
  lat?: number;
  lng?: number;
  [k: string]: unknown;
}

interface NodeRow {
  id: string;
  master_order_id: string | null;
  status: FulfillmentStatus;
  total_amount: number;
  items_count: number;
  created_at: string;
  delivery_snapshot: DeliverySnapshot | null;
}

interface NodeItem {
  id: string;
  sku_id: string;
  quantity: number;
  price_at_time: number;
  sku_code: string | null;
  asset_name: string | null;
}

const STATUS_LABEL: Record<string, string> = {
  pending: "قيد الانتظار",
  preparing: "جارٍ التجهيز",
  prepared: "جاهز",
  shipped: "تم الشحن",
  delivered: "تم التسليم",
  cancelled: "ملغي",
};

const STATUS_TONE: Record<string, string> = {
  pending: "bg-warning/15 text-warning",
  preparing: "bg-info/15 text-info",
  prepared: "bg-success/15 text-success",
  shipped: "bg-primary/15 text-primary",
  delivered: "bg-success/15 text-success",
  cancelled: "bg-destructive/15 text-destructive",
};

const fmtDate = (iso: string) => {
  try {
    return new Intl.DateTimeFormat("ar-EG", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
  } catch { return iso; }
};

export default function VendorOrders() {
  const { data: currentVendor, isLoading: vendorLoading } = useCurrentVendor();
  const vendorId = currentVendor?.vendor.id ?? null;
  const updateStatus = useUpdateFulfillmentStatus();
  const [detailsNode, setDetailsNode] = useState<NodeRow | null>(null);

  const { data: items, isLoading: itemsLoading } = useQuery<NodeItem[]>({
    queryKey: ["fulfillment-items", detailsNode?.id],
    enabled: !!detailsNode?.id,
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sb = supabase as any;
      const { data, error } = await sb
        .from("salsabil_fulfillment_items")
        .select(`
          id, sku_id, quantity, price_at_time,
          sku:salsabil_skus(sku_code, asset:salsabil_assets(name))
        `)
        .eq("node_id", detailsNode!.id);
      if (error) throw error;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (data ?? []).map((r: any): NodeItem => ({
        id: r.id,
        sku_id: r.sku_id,
        quantity: r.quantity,
        price_at_time: Number(r.price_at_time),
        sku_code: r.sku?.sku_code ?? null,
        asset_name: r.sku?.asset?.name ?? null,
      }));
  const queryClient = useQueryClient();

  // Realtime radar — vendor-scoped subscription on fulfillment_nodes
  useEffect(() => {
    if (!vendorId) return;
    const channel = supabase
      .channel(`vendor-fulfillment-${vendorId}`)
      .on(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        "postgres_changes" as any,
        { event: "*", schema: "public", table: "salsabil_fulfillment_nodes", filter: `vendor_id=eq.${vendorId}` },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (payload: any) => {
          if (payload.eventType === "INSERT") toast.success("طلب جديد بحاجة للتجهيز!");
          else if (payload.eventType === "UPDATE") toast("تم تحديث حالة الطلب");
          queryClient.invalidateQueries({ queryKey: ["admin-grid", "salsabil_fulfillment_nodes"] });
          queryClient.invalidateQueries({ queryKey: ["vendor-fulfillment-nodes"] });
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [vendorId, queryClient]);

    { key: "total", label: "إجمالي الطلبات", icon: Package, tone: "primary", compute: (r) => fmtNum(r.length) },
    { key: "pending", label: "قيد الانتظار", icon: Clock, tone: "warning", compute: (r) => fmtNum(r.filter((x) => x.status === "pending" || x.status === "preparing").length), urgent: (r) => r.some((x) => x.status === "pending") },
    { key: "ready", label: "جاهزة/مشحونة", icon: CheckCircle2, tone: "success", compute: (r) => fmtNum(r.filter((x) => x.status === "prepared" || x.status === "shipped" || x.status === "delivered").length) },
  ], []);

  const columns = useMemo<Column<NodeRow>[]>(() => [
    {
      key: "id",
      label: "رقم الطلب",
      className: "flex-1 min-w-0",
      render: (r) => (
        <div className="min-w-0">
          <p className="font-mono text-[12px] truncate">#{(r.master_order_id ?? r.id).slice(0, 8)}</p>
          <p className="text-[10.5px] text-foreground-tertiary">{fmtDate(r.created_at)}</p>
        </div>
      ),
    },
    {
      key: "status",
      label: "الحالة",
      className: "flex-1",
      render: (r) => (
        <span className={`text-[10.5px] font-bold px-2.5 py-1 rounded-full ${STATUS_TONE[r.status] ?? "bg-muted text-foreground-secondary"}`}>
          {STATUS_LABEL[r.status] ?? r.status}
        </span>
      ),
    },
    {
      key: "items_count",
      label: "الأصناف",
      className: "flex-1",
      hideOnMobile: true,
      render: (r) => <span className="font-display num text-[13.5px]">{fmtNum(r.items_count)}</span>,
    },
    {
      key: "total_amount",
      label: "الإجمالي",
      className: "flex-1",
      render: (r) => <span className="font-display num text-[13.5px]">{fmtMoney(r.total_amount)} <span className="text-[10px] text-foreground-tertiary">EGP</span></span>,
    },
  ], []);

  const rowActions = useMemo<RowAction<NodeRow>[]>(() => [
    { label: "تفاصيل الطلب", icon: Eye, onClick: (r) => setDetailsNode(r) },
    {
      label: "تغيير الحالة إلى جاهز",
      icon: PackageCheck,
      onClick: (r) => {
        if (r.status === "prepared" || r.status === "shipped" || r.status === "delivered") return;
        updateStatus.mutate({ node_id: r.id, status: "prepared" });
      },
    },
  ], [updateStatus]);

  if (vendorLoading) {
    return <div className="p-10 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }
  if (!currentVendor) {
    return (
      <div className="p-6 text-center">
        <p className="text-[13px] text-foreground-secondary">لا يوجد كيان شركة (Tenant) مرتبط بحسابك بعد.</p>
      </div>
    );
  }

  return (
    <>
      <UniversalAdminGrid<NodeRow>
        title="الطلبات"
        subtitle={`الطلبات الموجّهة إلى «${currentVendor.vendor.business_name}» عبر محرك التوزيع اللامركزي.`}
        metrics={metrics}
        columns={columns}
        rowActions={rowActions}
        searchPlaceholder="ابحث برقم الطلب…"
        empty={{ icon: Package, title: "لا توجد طلبات بعد", hint: "ستظهر هنا فور توجيه أي طلب لمخزنك." }}
        dataSource={{
          table: "salsabil_fulfillment_nodes",
          select: "id, master_order_id, status, total_amount, created_at, delivery_snapshot, salsabil_fulfillment_items(id)",
          orderBy: { column: "created_at", ascending: false },
          searchKeys: ["master_order_id"],
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          map: (raw: any): NodeRow => ({
            id: raw.id,
            master_order_id: raw.master_order_id,
            status: raw.status as FulfillmentStatus,
            total_amount: Number(raw.total_amount ?? 0),
            items_count: (raw.salsabil_fulfillment_items ?? []).length,
            created_at: raw.created_at,
            delivery_snapshot: (raw.delivery_snapshot ?? null) as DeliverySnapshot | null,
          }),
        }}
        rowKey={(r) => r.id}
      />

      <Dialog open={!!detailsNode} onOpenChange={(o) => !o && setDetailsNode(null)}>
        <DialogContent dir="rtl" className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-[18px]">
              تفاصيل الطلب #{(detailsNode?.master_order_id ?? detailsNode?.id ?? "").slice(0, 8)}
            </DialogTitle>
          </DialogHeader>
          {detailsNode && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-[12px]">
                <span className={`font-bold px-2.5 py-1 rounded-full ${STATUS_TONE[detailsNode.status] ?? ""}`}>
                  {STATUS_LABEL[detailsNode.status] ?? detailsNode.status}
                </span>
                <span className="font-display num text-[14px]">{fmtMoney(detailsNode.total_amount)} EGP</span>
              </div>

              {itemsLoading ? (
                <div className="h-24 flex items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
              ) : !items?.length ? (
                <p className="text-[12px] text-foreground-tertiary text-center py-4">لا توجد أصناف.</p>
              ) : (
                <ul className="space-y-2">
                  {items.map((it) => (
                    <li key={it.id} className="flex items-center justify-between rounded-xl bg-surface-muted px-3 py-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-[13px] truncate">{it.asset_name ?? "—"}</p>
                        <p className="text-[10.5px] text-foreground-tertiary num">SKU: {it.sku_code ?? "—"}</p>
                      </div>
                      <div className="text-left">
                        <p className="font-display num text-[13px]">×{it.quantity}</p>
                        <p className="text-[10.5px] text-foreground-tertiary num">{fmtMoney(it.price_at_time)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
