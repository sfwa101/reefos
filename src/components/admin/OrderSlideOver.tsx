/**
 * OrderSlideOver — Wave R-2 · Batch A.2.
 * Pure presentation. All reads/writes flow through ops gateway.
 */
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { fmtMoney } from "@/lib/format";
import { Loader2, ExternalLink, Truck, Phone, Receipt, Package } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  getMasterOrderDetailFn,
  assignDriverToOrderFn,
  listActiveDriversFn,
} from "@/core/ops/ops.functions";

type Props = { orderId: string | null; onClose: () => void };

export function OrderSlideOver({ orderId, onClose }: Props) {
  const fetchDetail = useServerFn(getMasterOrderDetailFn);
  const fetchDrivers = useServerFn(listActiveDriversFn);
  const assignDriver = useServerFn(assignDriverToOrderFn);
  const [busy, setBusy] = useState(false);

  const { data: detail, isLoading } = useQuery({
    queryKey: ["admin", "order-detail", orderId],
    queryFn: () => fetchDetail({ data: { orderId: orderId! } }),
    enabled: !!orderId,
  });

  const { data: drivers } = useQuery({
    queryKey: ["admin", "active-drivers"],
    queryFn: () => fetchDrivers(),
    enabled: !!orderId,
  });

  useEffect(() => { if (!orderId) setBusy(false); }, [orderId]);

  const assign = async (driverId: string) => {
    if (!detail || !detail.node_ids.length || busy) return;
    setBusy(true);
    try {
      await assignDriver({ data: { nodeIds: detail.node_ids, driverId } });
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={!!orderId} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="left" className="w-full sm:max-w-lg p-0 overflow-y-auto" dir="rtl">
        {isLoading || !detail ? (
          <div className="h-full flex items-center justify-center p-10">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className="bg-gradient-to-br from-primary to-primary-glow text-primary-foreground p-5">
              <p className="text-[11px] opacity-80">طلب سيادي رقم</p>
              <p className="font-mono text-[14px] truncate">#{String(detail.id).slice(0, 8).toUpperCase()}</p>
              <p className="font-display text-[28px] num mt-2">{fmtMoney(detail.total_amount)}</p>
              <Link to="/admin/orders/$orderId" params={{ orderId: detail.id }} onClick={onClose}
                className="inline-flex items-center gap-1 mt-2 text-[11px] bg-primary-foreground/20 backdrop-blur rounded-full px-2.5 py-1">
                <ExternalLink className="h-3 w-3" /> فتح الصفحة الكاملة
              </Link>
            </div>

            <div className="p-5 space-y-4">
              <div className="bg-surface rounded-2xl border border-border/40 p-3.5 space-y-2">
                <h3 className="font-display text-[14px] flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> العميل</h3>
                <p className="text-[13px]">{detail.customer?.full_name ?? "—"}</p>
                <p className="text-[12px] text-foreground-tertiary num" dir="ltr">{detail.customer?.phone ?? "—"}</p>
              </div>

              <div className="bg-surface rounded-2xl border border-border/40 p-3.5 space-y-2">
                <h3 className="font-display text-[14px] flex items-center gap-1.5">
                  <Receipt className="h-3.5 w-3.5" /> الفاتورة ({detail.items.length})
                  <span className="ms-auto inline-flex items-center gap-1 text-[10.5px] font-semibold text-foreground-tertiary">
                    <Package className="h-3 w-3" /> {detail.node_ids.length} عُقد
                  </span>
                </h3>
                <ul className="divide-y divide-border/40 text-[12.5px]">
                  {detail.items.map((it) => (
                    <li key={it.id} className="py-1.5 flex items-center justify-between gap-2">
                      <span className="truncate">{it.product_name}</span>
                      <span className="text-foreground-tertiary shrink-0">×{it.quantity}</span>
                      <span className="num shrink-0 font-semibold">{fmtMoney(it.total)}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-surface rounded-2xl border border-border/40 p-3.5">
                <h3 className="font-display text-[14px] mb-2 flex items-center gap-1.5"><Truck className="h-3.5 w-3.5" /> تعيين مندوب لكل العُقد</h3>
                <div className="space-y-1.5 max-h-56 overflow-y-auto">
                  {(!drivers || drivers.length === 0) && (
                    <p className="text-[12px] text-foreground-tertiary">لا يوجد مناديب متاحون</p>
                  )}
                  {(drivers ?? []).map((d) => (
                    <Button
                      key={d.id}
                      disabled={busy}
                      onClick={() => assign(d.id)}
                      className="w-full text-right p-2 rounded-xl bg-surface-muted hover:bg-primary/10 hover:text-primary transition text-[12.5px] flex items-center justify-between disabled:opacity-50"
                    >
                      <span>{d.full_name ?? "مندوب"}</span>
                      <span className="text-[10px] text-foreground-tertiary num" dir="ltr">{d.phone ?? ""}</span>
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
