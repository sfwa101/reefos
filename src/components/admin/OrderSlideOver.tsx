/**
 * OrderSlideOver — Sovereign Matrix Edition (Phase 14 Part 2)
 *
 * Reads exclusively from `salsabil_master_orders` ➜ `salsabil_fulfillment_nodes`
 * ➜ `salsabil_fulfillment_items` ➜ `salsabil_skus` ➜ `salsabil_assets`.
 * Driver assignment writes into `salsabil_fulfillment_nodes.driver_id`.
 */
import { useEffect, useState } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { fmtMoney } from "@/lib/format";
import { Loader2, ExternalLink, Truck, Phone, Receipt, Package } from "lucide-react";
import { Link } from "@tanstack/react-router";

type Props = { orderId: string | null; onClose: () => void };

interface MasterOrderView {
  id: string;
  total_amount: number;
  status: string;
  customer_name: string | null;
  customer_phone: string | null;
}

interface NodeItemView {
  node_id: string;
  vendor_id: string;
  node_status: string;
  item_id: string;
  quantity: number;
  price_at_time: number;
  asset_name: string;
}

interface DriverView {
  user_id: string;
  full_name: string | null;
  phone: string | null;
}

export function OrderSlideOver({ orderId, onClose }: Props) {
  const [order, setOrder] = useState<MasterOrderView | null>(null);
  const [items, setItems] = useState<NodeItemView[]>([]);
  const [nodeIds, setNodeIds] = useState<string[]>([]);
  const [drivers, setDrivers] = useState<DriverView[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!orderId) {
      setOrder(null);
      setItems([]);
      setNodeIds([]);
      return;
    }
    setLoading(true);
    (async () => {
      // 1) Master order + customer profile.
      const { data: master } = await supabase
        .from("salsabil_master_orders")
        .select("id,total_amount,status,customer_id")
        .eq("id", orderId)
        .maybeSingle();

      let customer: { full_name: string | null; phone: string | null } | null = null;
      if (master?.customer_id) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("full_name,phone")
          .eq("id", master.customer_id)
          .maybeSingle();
        customer = prof;
      }

      // 2) Fulfillment nodes + nested items + sku ➜ asset (for display name).
      const { data: nodes } = await supabase
        .from("salsabil_fulfillment_nodes")
        .select(`
          id, vendor_id, status,
          salsabil_fulfillment_items (
            id, quantity, price_at_time,
            salsabil_skus ( salsabil_assets ( name ) )
          )
        `)
        .eq("master_order_id", orderId);

      const flatItems: NodeItemView[] = [];
      const ids: string[] = [];
      (nodes ?? []).forEach((n) => {
        ids.push(n.id);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const fis: any[] = (n as any).salsabil_fulfillment_items ?? [];
        fis.forEach((it) => {
          flatItems.push({
            node_id: n.id,
            vendor_id: n.vendor_id,
            node_status: n.status,
            item_id: it.id,
            quantity: it.quantity,
            price_at_time: Number(it.price_at_time ?? 0),
            asset_name: it?.salsabil_skus?.salsabil_assets?.name ?? "منتج",
          });
        });
      });

      // 3) Available delivery drivers (for one-tap assignment).
      const { data: drv } = await supabase
        .from("user_roles")
        .select("user_id, profiles:user_id(full_name,phone)")
        .eq("role", "delivery")
        .limit(20);

      setOrder(master ? {
        id: master.id,
        total_amount: Number(master.total_amount ?? 0),
        status: master.status,
        customer_name: customer?.full_name ?? null,
        customer_phone: customer?.phone ?? null,
      } : null);
      setItems(flatItems);
      setNodeIds(ids);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setDrivers(((drv ?? []) as any[]).map((d) => ({
        user_id: d.user_id,
        full_name: d.profiles?.full_name ?? null,
        phone: d.profiles?.phone ?? null,
      })));
      setLoading(false);
    })();
  }, [orderId]);

  // Assign all nodes of this master order to a single driver (admin override).
  const assign = async (driverId: string) => {
    if (!nodeIds.length) return;
    const { error } = await supabase
      .from("salsabil_fulfillment_nodes")
      .update({ driver_id: driverId, status: "out_for_delivery", assigned_at: new Date().toISOString() })
      .in("id", nodeIds);
    if (!error) onClose();
  };

  return (
    <Sheet open={!!orderId} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="left" className="w-full sm:max-w-lg p-0 overflow-y-auto" dir="rtl">
        {loading || !order ? (
          <div className="h-full flex items-center justify-center p-10">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className="bg-gradient-to-br from-primary to-primary-glow text-primary-foreground p-5">
              <p className="text-[11px] opacity-80">طلب سيادي رقم</p>
              <p className="font-mono text-[14px] truncate">#{String(order.id).slice(0, 8).toUpperCase()}</p>
              <p className="font-display text-[28px] num mt-2">{fmtMoney(order.total_amount)}</p>
              <Link to="/admin/orders/$orderId" params={{ orderId: order.id }} onClick={onClose}
                className="inline-flex items-center gap-1 mt-2 text-[11px] bg-primary-foreground/20 backdrop-blur rounded-full px-2.5 py-1">
                <ExternalLink className="h-3 w-3" /> فتح الصفحة الكاملة
              </Link>
            </div>

            <div className="p-5 space-y-4">
              <div className="bg-surface rounded-2xl border border-border/40 p-3.5 space-y-2">
                <h3 className="font-display text-[14px] flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> العميل</h3>
                <p className="text-[13px]">{order.customer_name ?? "—"}</p>
                <p className="text-[12px] text-foreground-tertiary num" dir="ltr">{order.customer_phone ?? "—"}</p>
              </div>

              <div className="bg-surface rounded-2xl border border-border/40 p-3.5 space-y-2">
                <h3 className="font-display text-[14px] flex items-center gap-1.5">
                  <Receipt className="h-3.5 w-3.5" /> الفاتورة ({items.length})
                  <span className="ms-auto inline-flex items-center gap-1 text-[10.5px] font-semibold text-foreground-tertiary">
                    <Package className="h-3 w-3" /> {nodeIds.length} عُقد
                  </span>
                </h3>
                <ul className="divide-y divide-border/40 text-[12.5px]">
                  {items.map((it) => (
                    <li key={it.item_id} className="py-1.5 flex items-center justify-between gap-2">
                      <span className="truncate">{it.asset_name}</span>
                      <span className="text-foreground-tertiary shrink-0">×{it.quantity}</span>
                      <span className="num shrink-0 font-semibold">{fmtMoney(it.price_at_time * it.quantity)}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-surface rounded-2xl border border-border/40 p-3.5">
                <h3 className="font-display text-[14px] mb-2 flex items-center gap-1.5"><Truck className="h-3.5 w-3.5" /> تعيين مندوب لكل العُقد</h3>
                <div className="space-y-1.5 max-h-56 overflow-y-auto">
                  {drivers.length === 0 && <p className="text-[12px] text-foreground-tertiary">لا يوجد مناديب متاحون</p>}
                  {drivers.map((d) => (
                    <button key={d.user_id} onClick={() => assign(d.user_id)}
                      className="w-full text-right p-2 rounded-xl bg-surface-muted hover:bg-primary/10 hover:text-primary transition text-[12.5px] flex items-center justify-between">
                      <span>{d.full_name ?? "مندوب"}</span>
                      <span className="text-[10px] text-foreground-tertiary num" dir="ltr">{d.phone ?? ""}</span>
                    </button>
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
