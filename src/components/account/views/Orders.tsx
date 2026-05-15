import { useEffect, useState } from "react";
import BackHeader from "@/components/BackHeader";
import { Package, Truck, Check, RotateCcw, Clock, Loader2, ShoppingBag, X, type LucideIcon } from "lucide-react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/context/AuthContext";
import { OrderGateway, type SovereignOrderVM as SovereignOrder, type SovereignOrderNodeVM as SovereignNode } from "@/core/orders";
import { fmtMoney, toLatin } from "@/lib/format";
import { useCart } from "@/core/orders/runtime/react/CartProvider";
import { getById } from "@/core/catalog/runtime/legacyRuntime";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

/**
 * Phase 14 Part 1 — Customer Order History rewritten to read exclusively
 * from the Sovereign Matrix:
 *   salsabil_master_orders
 *     └─ salsabil_fulfillment_nodes (per-vendor leg, status, totals)
 *         └─ salsabil_fulfillment_items (qty, price, sku → asset)
 * Zero reads of legacy `orders` / `order_items`.
 */

// Sovereign order types are imported from @/core/orders.

const statusInfo: Record<string, { label: string; color: string; icon: LucideIcon }> = {
  delivered:                { label: "تم التسليم",  color: "bg-success/15 text-success",                icon: Check },
  out_for_delivery:         { label: "في الطريق",   color: "bg-accent text-accent-foreground",          icon: Truck },
  preparing:                { label: "قيد التحضير", color: "bg-warning/15 text-warning",                icon: Clock },
  confirmed:                { label: "مؤكد",         color: "bg-info/15 text-info",                      icon: Check },
  pending:                  { label: "بانتظار",      color: "bg-foreground/10 text-foreground",          icon: Clock },
  requires_admin_routing:   { label: "بحاجة توجيه",  color: "bg-warning/15 text-warning",                icon: Clock },
  cancelled:                { label: "ملغي",         color: "bg-destructive/15 text-destructive",        icon: X },
};

const formatDate = (iso: string) => {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today.getTime() - 86400000);
  const sameDay = d.toDateString() === today.toDateString();
  const wasYesterday = d.toDateString() === yesterday.toDateString();
  const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  if (sameDay) return `اليوم ${time}`;
  if (wasYesterday) return `أمس ${time}`;
  return d.toLocaleDateString("en-GB") + " " + time;
};

/** Roll up node statuses into a single headline status for the master order. */
const aggregateStatus = (nodes: SovereignNode[]): string => {
  if (nodes.length === 0) return "pending";
  const statuses = nodes.map((n) => n.status);
  if (statuses.every((s) => s === "delivered")) return "delivered";
  if (statuses.every((s) => s === "cancelled")) return "cancelled";
  if (statuses.some((s) => s === "out_for_delivery")) return "out_for_delivery";
  if (statuses.some((s) => s === "preparing" || s === "assigned")) return "preparing";
  if (statuses.some((s) => s === "confirmed")) return "confirmed";
  return statuses[0] ?? "pending";
};

const firstMedia = (media: unknown): string | null => {
  if (Array.isArray(media) && media.length > 0 && typeof media[0] === "string") {
    return media[0];
  }
  return null;
};

const assetIdToLegacyProductId = (assetId: string) =>
  `usa_${assetId.replace(/-/g, "")}`;

const Orders = () => {
  const { user } = useAuth();
  const { add } = useCart();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<SovereignOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const data = await OrderGateway.getCustomerOrders(user.id);
      setOrders(data);
      setLoading(false);
    })();
  }, [user]);

  const reorder = (o: SovereignOrder) => {
    const allItems = o.salsabil_fulfillment_nodes.flatMap(
      (n) => n.salsabil_fulfillment_items,
    );
    if (allItems.length === 0) return;
    let added = 0;
    for (const it of allItems) {
      const assetId = it.salsabil_skus?.asset_id ?? null;
      const legacyId = assetId ? assetIdToLegacyProductId(assetId) : "";
      const p = legacyId ? getById(legacyId) : undefined;
      const name = it.salsabil_skus?.salsabil_assets?.name ?? "منتج";
      const image = firstMedia(it.salsabil_skus?.salsabil_assets?.media) ?? "";
      if (p) {
        add(p, it.quantity);
        added++;
      } else {
        add(
          {
            id: legacyId || `custom-${it.id}`,
            name,
            unit: "",
            price: Number(it.price_at_time),
            image,
            category: "إعادة طلب",
            source: "supermarket",
          },
          it.quantity,
        );
        added++;
      }
    }
    if (added === 0) {
      toast.error("تعذّر إضافة المنتجات");
      return;
    }
    toast.success("تمت الإضافة إلى السلة");
    navigate({ to: "/cart" });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <BackHeader title="طلباتي" accent="حسابي" />
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="space-y-4">
        <BackHeader title="طلباتي" accent="حسابي" />
        <div className="mt-12 flex flex-col items-center gap-4 text-center">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary-soft">
            <ShoppingBag className="h-10 w-10 text-primary" />
          </div>
          <h2 className="font-display text-xl font-extrabold">لا طلبات بعد</h2>
          <p className="text-sm text-muted-foreground">طلباتك ستظهر هنا فور إتمامها</p>
          <Link to="/sections" className="rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-pill">
            ابدأ التسوّق
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <BackHeader title="طلباتي" subtitle={`${toLatin(orders.length)} طلبات`} accent="حسابي" />

      <div className="space-y-3">
        {orders.map((o) => {
          const headline = aggregateStatus(o.salsabil_fulfillment_nodes);
          const info = statusInfo[headline] ?? statusInfo.pending;
          const Icon = info.icon;
          const items = o.salsabil_fulfillment_nodes.flatMap(
            (n) => n.salsabil_fulfillment_items,
          );
          const itemCount = items.reduce((s, it) => s + it.quantity, 0);
          const shortId = o.id.slice(0, 8).toUpperCase();
          const vendorCount = o.salsabil_fulfillment_nodes.length;
          return (
            <div key={o.id} className="glass-strong rounded-2xl p-4 shadow-soft">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-primary" />
                    <p className="font-display text-sm font-extrabold tabular-nums">RF-{shortId}</p>
                  </div>
                  <p className="mt-0.5 text-[11px] text-muted-foreground tabular-nums">
                    {formatDate(o.created_at)} · {toLatin(itemCount)} منتجات
                    {vendorCount > 1 ? ` · ${toLatin(vendorCount)} بائعين` : ""}
                  </p>
                </div>
                <span className={`flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold ${info.color}`}>
                  <Icon className="h-3 w-3" /> {info.label}
                </span>
              </div>

              {items.length > 0 && (
                <div className="mt-3 flex gap-1.5 overflow-x-auto no-scrollbar">
                  {items.slice(0, 5).map((it) => {
                    const img = firstMedia(it.salsabil_skus?.salsabil_assets?.media);
                    const name = it.salsabil_skus?.salsabil_assets?.name ?? "منتج";
                    return img ? (
                      <img key={it.id} src={img} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" />
                    ) : (
                      <div key={it.id} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-foreground/5 text-[10px] font-bold">
                        {name.slice(0, 2)}
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                <span className="font-display text-base font-extrabold text-primary tabular-nums">
                  {fmtMoney(Number(o.total_amount))}
                </span>
                <Button onClick={() => reorder(o)} className="flex items-center gap-1 rounded-full bg-foreground/5 px-3 py-1.5 text-[11px] font-bold">
                  <RotateCcw className="h-3 w-3" /> أعد الطلب
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Orders;
