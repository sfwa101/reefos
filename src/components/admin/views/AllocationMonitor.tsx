import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Loader2, Package, RefreshCcw, MapPin, AlertTriangle, Radio, Snowflake } from "lucide-react";
import { toast } from "sonner";
import {
  listUnassignedNodesFn,
  broadcastSmartDispatchFn,
  listRecentMasterOrdersWithSubCountFn,
  getAllocationOverviewFn,
  allocateOrderInventoryFn,
} from "@/core/ops/ops.functions";

type UnassignedNode = {
  id: string;
  master_order_id: string | null;
  status: string;
  total_amount: number | null;
  created_at: string;
  vendor_id: string | null;
  pickup_lat: number | null;
  pickup_lng: number | null;
};

type SubOrderRow = {
  sub_order_id: string;
  status: string;
  total: number;
  notes: string | null;
  items: Array<{ product_name: string; quantity: number; price: number }> | null;
};

type RecentOrder = {
  id: string;
  total: number;
  status: string;
  created_at: string;
  user_id: string;
  sub_count: number;
};

export default function AllocationMonitor() {
  const [orders, setOrders] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
  const [allocation, setAllocation] = useState<SubOrderRow[]>([]);
  const [reallocating, setReallocating] = useState(false);
  const [zoneInput, setZoneInput] = useState("M");
  const [unassigned, setUnassigned] = useState<UnassignedNode[]>([]);
  const [loadingNodes, setLoadingNodes] = useState(false);
  const [broadcastingId, setBroadcastingId] = useState<string | null>(null);

  async function loadUnassignedNodes() {
    setLoadingNodes(true);
    try {
      const data = await listUnassignedNodesFn();
      setUnassigned(data as UnassignedNode[]);
    } catch {
      setUnassigned([]);
    } finally {
      setLoadingNodes(false);
    }
  }

  async function broadcast(nodeId: string) {
    setBroadcastingId(nodeId);
    try {
      const { count } = await broadcastSmartDispatchFn({ data: { nodeId } });
      if (count === 0) {
        toast.warning("لا يوجد مندوبون متاحون — قد يتطلب توجيه يدوي");
      } else {
        toast.success(`تم بث العرض إلى ${count} مندوب`);
      }
      await loadUnassignedNodes();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBroadcastingId(null);
    }
  }

  async function loadOrders() {
    setLoading(true);
    try {
      const rows = await listRecentMasterOrdersWithSubCountFn();
      setOrders(
        rows.map((m) => ({
          id: m.id,
          total: Number(m.total_amount ?? 0),
          status: m.status,
          created_at: m.created_at,
          user_id: m.customer_id,
          sub_count: m.sub_count,
        })),
      );
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadAllocation(orderId: string) {
    setSelectedOrder(orderId);
    try {
      const data = await getAllocationOverviewFn({ data: { orderId } });
      setAllocation((data as SubOrderRow[]) || []);
    } catch {
      toast.error("تعذّر تحميل تفاصيل التوزيع");
    }
  }

  async function reallocate(orderId: string) {
    setReallocating(true);
    try {
      const result = await allocateOrderInventoryFn({
        data: { orderId, zone: zoneInput || "M" },
      });
      toast.success(
        `تم التوزيع: ${result?.allocated_items ?? 0} عنصر${result?.failed_items?.length ? ` — ${result.failed_items.length} فشل` : ""}`,
      );
      await loadAllocation(orderId);
      await loadOrders();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setReallocating(false);
    }
  }

  useEffect(() => {
    loadOrders();
    loadUnassignedNodes();
  }, []);

  return (
    <div className="space-y-4 p-4 pb-24">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Package className="h-5 w-5" /> مراقبة التوزيع الذكي
          </h1>
          <p className="text-xs text-muted-foreground">تقسيم الطلبات على أقرب مخزن وحجز المخزون</p>
        </div>
        <Button size="sm" variant="outline" onClick={loadOrders} disabled={loading}>
          <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">آخر 50 طلباً</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[60vh] overflow-y-auto">
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin mx-auto" />
            ) : orders.length === 0 ? (
              <p className="text-sm text-muted-foreground">لا توجد طلبات</p>
            ) : (
              orders.map((o) => (
                <Button
                  key={o.id}
                  onClick={() => loadAllocation(o.id)}
                  className={`w-full text-right rounded-lg border p-3 transition ${
                    selectedOrder === o.id ? "border-primary bg-primary/5" : "hover:bg-accent"
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono">{o.id.slice(0, 8)}…</span>
                    <Badge variant={o.sub_count > 0 ? "default" : "destructive"}>
                      {o.sub_count > 0 ? `${o.sub_count} مخزن` : "غير موزّع"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between mt-1 text-xs text-muted-foreground">
                    <span>{Number(o.total).toFixed(2)} ج.م</span>
                    <span>{new Date(o.created_at).toLocaleString("ar-EG")}</span>
                  </div>
                </Button>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <MapPin className="h-4 w-4" /> تفاصيل التوزيع
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!selectedOrder ? (
              <p className="text-sm text-muted-foreground">اختر طلباً لعرض التوزيع</p>
            ) : (
              <>
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <label className="text-xs text-muted-foreground">منطقة (zone)</label>
                    <Input
                      value={zoneInput}
                      onChange={(e) => setZoneInput(e.target.value.toUpperCase())}
                      placeholder="M"
                      className="h-8"
                    />
                  </div>
                  <Button
                    size="sm"
                    onClick={() => reallocate(selectedOrder)}
                    disabled={reallocating}
                  >
                    {reallocating ? <Loader2 className="h-4 w-4 animate-spin" /> : "إعادة التوزيع"}
                  </Button>
                </div>

                {allocation.length === 0 ? (
                  <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-xs flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                    <span>لم يُوزَّع هذا الطلب بعد. اضغط "إعادة التوزيع" لتشغيل المحرّك.</span>
                  </div>
                ) : (
                  allocation.map((sub) => (
                    <div key={sub.sub_order_id} className="rounded-lg border p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline">{sub.status}</Badge>
                        <span className="text-xs font-bold">{Number(sub.total).toFixed(2)} ج.م</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{sub.notes}</p>
                      <div className="space-y-1">
                        {(sub.items || []).map((it, i) => (
                          <div key={i} className="text-xs flex justify-between">
                            <span>
                              {it.product_name} ×{it.quantity}
                            </span>
                            <span className="text-muted-foreground">
                              {Number(it.price).toFixed(2)} ج.م
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm flex items-center gap-2">
            <Radio className="h-4 w-4" /> عقد التوصيل بدون مندوب — البث الذكي
          </CardTitle>
          <Button size="sm" variant="outline" onClick={loadUnassignedNodes} disabled={loadingNodes}>
            <RefreshCcw className={`h-4 w-4 ${loadingNodes ? "animate-spin" : ""}`} />
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {loadingNodes ? (
            <Loader2 className="h-5 w-5 animate-spin mx-auto" />
          ) : unassigned.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              كل العقد لديها مندوب 🎉
            </p>
          ) : (
            unassigned.map((n) => {
              const needsManual = n.status === "requires_admin_routing";
              return (
                <div
                  key={n.id}
                  className={`rounded-lg border p-3 flex items-center gap-3 ${
                    needsManual ? "border-destructive/40 bg-destructive/5" : ""
                  }`}
                >
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-mono">{n.id.slice(0, 8)}…</span>
                      {needsManual && (
                        <Badge variant="destructive" className="gap-1">
                          <Snowflake className="h-3 w-3" /> توجيه يدوي مطلوب
                        </Badge>
                      )}
                      <Badge variant="outline">{n.status}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-3">
                      <span>{Number(n.total_amount ?? 0).toFixed(2)} ج.م</span>
                      <span>{new Date(n.created_at).toLocaleString("ar-EG")}</span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => broadcast(n.id)}
                    disabled={broadcastingId === n.id}
                  >
                    {broadcastingId === n.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Radio className="h-4 w-4 ml-1" /> بث ذكي
                      </>
                    )}
                  </Button>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
