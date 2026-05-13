import { useState } from "react";
import { Truck, UserCheck, MapPin, Clock, CheckCircle2, AlertCircle, Package } from "lucide-react";
import { MobileTopbar } from "@/components/admin/MobileTopbar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { UniversalAdminGrid, type DataSource, type BentoMetric, type Column } from "@/components/admin/UniversalAdminGrid";

/**
 * Delivery Operations Hub — /admin/delivery
 * -----------------------------------------
 * One unified hub built entirely on the UniversalAdminGrid "stem cell".
 * Three tabs share the SAME core component, only the DataSource changes.
 */

// ---------- Tab 1: Active Tasks ----------
type Task = {
  id: string;
  order_id: string;
  driver_id: string | null;
  status: string;
  service_type: string;
  delivery_zone: string | null;
  cod_amount: number;
  cod_collected: boolean;
  created_at: string;
  estimated_minutes: number | null;
};

const taskMetrics: BentoMetric[] = [
  {
    key: "pending", label: "قيد الانتظار", icon: Clock, tone: "warning",
    compute: (rows: Task[]) => rows.filter((r) => r.status === "pending").length,
    urgent: (rows: Task[]) => rows.filter((r) => r.status === "pending").length > 5,
  },
  {
    key: "in_progress", label: "قيد التوصيل", icon: Truck, tone: "info",
    compute: (rows: Task[]) => rows.filter((r) => ["assigned", "picked_up", "in_transit"].includes(r.status)).length,
  },
  {
    key: "delivered_today", label: "تم التسليم اليوم", icon: CheckCircle2, tone: "success",
    compute: (rows: Task[]) => {
      const today = new Date().toISOString().slice(0, 10);
      return rows.filter((r) => r.status === "delivered" && r.created_at?.startsWith(today)).length;
    },
  },
  {
    key: "cod_pending", label: "نقد لم يُحصّل", icon: AlertCircle, tone: "accent",
    compute: (rows: Task[]) => {
      const sum = rows.filter((r) => r.cod_amount > 0 && !r.cod_collected).reduce((a, b) => a + Number(b.cod_amount || 0), 0);
      return `${Math.round(sum)} ج.م`;
    },
  },
];

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  pending:    { label: "بانتظار التعيين", cls: "bg-[hsl(var(--accent))]/10 text-[hsl(var(--accent))]" },
  assigned:   { label: "مع المندوب",       cls: "bg-[hsl(var(--info))]/10 text-[hsl(var(--info))]" },
  picked_up:  { label: "تم الاستلام",      cls: "bg-[hsl(var(--info))]/10 text-[hsl(var(--info))]" },
  in_transit: { label: "في الطريق",        cls: "bg-[hsl(var(--info))]/10 text-[hsl(var(--info))]" },
  delivered:  { label: "تم التسليم",       cls: "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]" },
  failed:     { label: "فشل",              cls: "bg-destructive/10 text-destructive" },
  canceled:   { label: "ملغي",             cls: "bg-muted text-foreground-tertiary" },
};

const taskColumns: Column<Task>[] = [
  {
    key: "order",
    render: (r) => (
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <Package className="h-3.5 w-3.5 text-foreground-tertiary shrink-0" />
          <span className="font-display text-[13.5px] truncate">#{r.order_id?.slice(0, 8)}</span>
        </div>
        <p className="text-[11px] text-foreground-tertiary mt-0.5">
          {r.delivery_zone ?? "—"} · {r.service_type === "express" ? "سريع" : "عادي"}
        </p>
      </div>
    ),
    className: "flex-1 min-w-0",
  },
  {
    key: "status",
    render: (r) => {
      const s = STATUS_LABEL[r.status] ?? { label: r.status, cls: "bg-muted text-foreground" };
      return <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${s.cls}`}>{s.label}</span>;
    },
    className: "shrink-0",
  },
  {
    key: "cod",
    hideOnMobile: true,
    render: (r) => r.cod_amount > 0 ? (
      <span className={`text-[12px] font-bold tabular-nums ${r.cod_collected ? "text-success" : "text-[hsl(var(--accent))]"}`}>
        {Math.round(r.cod_amount)} ج.م
      </span>
    ) : <span className="text-[11px] text-foreground-tertiary">—</span>,
    className: "w-24 text-left",
  },
];

const taskDataSource: DataSource<Task> = {
  table: "delivery_tasks",
  select: "id,order_id,driver_id,status,service_type,delivery_zone,cod_amount,cod_collected,created_at,estimated_minutes",
  orderBy: { column: "created_at", ascending: false },
  limit: 200,
  searchKeys: ["order_id", "delivery_zone", "status"],
};

// ---------- Tab 2: Drivers ----------
type Driver = {
  id: string;
  full_name: string;
  phone: string;
  driver_type: string;
  is_active: boolean;
  current_zone: string | null;
  vehicle_type: string | null;
  vehicle_plate: string | null;
  last_seen_at: string | null;
};

function driverIsBusy(d: Driver): boolean {
  if (!d.last_seen_at) return false;
  const diff = Date.now() - new Date(d.last_seen_at).getTime();
  return diff < 5 * 60 * 1000; // seen within last 5 min ≈ on shift
}

const driverMetrics: BentoMetric[] = [
  {
    key: "total", label: "إجمالي المناديب", icon: UserCheck, tone: "primary",
    compute: (rows: Driver[]) => rows.length,
  },
  {
    key: "active", label: "نشط الآن", icon: Truck, tone: "success",
    compute: (rows: Driver[]) => rows.filter((d) => d.is_active && driverIsBusy(d)).length,
  },
  {
    key: "available", label: "متاح", icon: CheckCircle2, tone: "info",
    compute: (rows: Driver[]) => rows.filter((d) => d.is_active && !driverIsBusy(d)).length,
  },
  {
    key: "inactive", label: "غير نشط", icon: AlertCircle, tone: "warning",
    compute: (rows: Driver[]) => rows.filter((d) => !d.is_active).length,
  },
];

const driverColumns: Column<Driver>[] = [
  {
    key: "name",
    render: (d) => (
      <div className="min-w-0">
        <p className="font-display text-[13.5px] truncate">{d.full_name}</p>
        <p className="text-[11px] text-foreground-tertiary mt-0.5 truncate">
          {d.phone} · {d.vehicle_type ?? "—"}{d.vehicle_plate ? ` (${d.vehicle_plate})` : ""}
        </p>
      </div>
    ),
    className: "flex-1 min-w-0",
  },
  {
    key: "zone",
    hideOnMobile: true,
    render: (d) => (
      <span className="text-[12px] text-foreground-secondary">{d.current_zone ?? "—"}</span>
    ),
    className: "w-32 shrink-0",
  },
  {
    key: "status",
    render: (d) => {
      if (!d.is_active) return <span className="inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold bg-muted text-foreground-tertiary">غير نشط</span>;
      const busy = driverIsBusy(d);
      return (
        <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${busy ? "bg-[hsl(var(--info))]/10 text-[hsl(var(--info))]" : "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]"}`}>
          {busy ? "نشط" : "متاح"}
        </span>
      );
    },
    className: "shrink-0",
  },
];

const driverDataSource: DataSource<Driver> = {
  table: "drivers",
  select: "id,full_name,phone,driver_type,is_active,current_zone,vehicle_type,vehicle_plate,last_seen_at",
  orderBy: { column: "is_active", ascending: false },
  limit: 200,
  searchKeys: ["full_name", "phone", "current_zone", "vehicle_plate"],
};

// ---------- Tab 3: Zones ----------
type Zone = {
  id: string;
  zone_id: string;
  product_id: string | null;
  category_id: string | null;
  branch_id: string | null;
  is_available: boolean;
  created_at: string;
};

const zoneMetrics: BentoMetric[] = [
  {
    key: "zones", label: "المناطق المغطاة", icon: MapPin, tone: "primary",
    compute: (rows: Zone[]) => new Set(rows.map((r) => r.zone_id)).size,
  },
  {
    key: "available", label: "قواعد متاحة", icon: CheckCircle2, tone: "success",
    compute: (rows: Zone[]) => rows.filter((r) => r.is_available).length,
  },
  {
    key: "blocked", label: "قواعد محظورة", icon: AlertCircle, tone: "accent",
    compute: (rows: Zone[]) => rows.filter((r) => !r.is_available).length,
  },
  {
    key: "rules_total", label: "إجمالي القواعد", icon: Package, tone: "info",
    compute: (rows: Zone[]) => rows.length,
  },
];

const zoneColumns: Column<Zone>[] = [
  {
    key: "zone",
    render: (z) => (
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <MapPin className="h-3.5 w-3.5 text-foreground-tertiary shrink-0" />
          <span className="font-display text-[13.5px] truncate">{z.zone_id}</span>
        </div>
        <p className="text-[11px] text-foreground-tertiary mt-0.5 truncate">
          {z.product_id ? `منتج: ${z.product_id}` : z.category_id ? `فئة: ${z.category_id.slice(0, 8)}` : "عام"}
        </p>
      </div>
    ),
    className: "flex-1 min-w-0",
  },
  {
    key: "scope",
    hideOnMobile: true,
    render: (z) => (
      <span className="text-[12px] text-foreground-secondary">
        {z.product_id ? "منتج" : z.category_id ? "فئة" : "—"}
      </span>
    ),
    className: "w-24 shrink-0",
  },
  {
    key: "available",
    render: (z) => (
      <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${z.is_available ? "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]" : "bg-destructive/10 text-destructive"}`}>
        {z.is_available ? "متاحة" : "محظورة"}
      </span>
    ),
    className: "shrink-0",
  },
];

const zoneDataSource: DataSource<Zone> = {
  table: "zone_availability",
  select: "id,zone_id,product_id,category_id,branch_id,is_available,created_at",
  orderBy: { column: "created_at", ascending: false },
  limit: 300,
  searchKeys: ["zone_id", "product_id"],
};

// ---------- Page ----------
type TabKey = "tasks" | "drivers" | "zones";

export default function Delivery() {
  // Read deep-link hash (e.g. /admin/delivery#zones) on mount.
  const initial: TabKey = (typeof window !== "undefined" && window.location.hash === "#zones") ? "zones"
    : (typeof window !== "undefined" && window.location.hash === "#drivers") ? "drivers"
    : "tasks";
  const [tab, setTab] = useState<TabKey>(initial);

  return (
    <>
      <MobileTopbar title="مركز التوصيل" />

      <div className="hidden lg:block px-6 pt-8 pb-3 max-w-[1400px] mx-auto">
        <h1 className="font-display text-[30px] tracking-tight">مركز التوصيل</h1>
        <p className="text-[13px] text-foreground-secondary mt-1">
          إدارة المهام، المناديب، ومناطق التغطية في مكان واحد
        </p>
      </div>

      <div className="px-4 lg:px-6 pt-3 max-w-[1400px] mx-auto">
        <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)} className="w-full">
          <TabsList className="grid w-full grid-cols-3 rounded-2xl bg-surface border border-border/50 p-1 shadow-soft">
            <TabsTrigger value="tasks" className="rounded-xl text-[12.5px] font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Truck className="h-3.5 w-3.5 ml-1.5 inline -mt-0.5" />
              المهام النشطة
            </TabsTrigger>
            <TabsTrigger value="drivers" className="rounded-xl text-[12.5px] font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <UserCheck className="h-3.5 w-3.5 ml-1.5 inline -mt-0.5" />
              المناديب
            </TabsTrigger>
            <TabsTrigger value="zones" className="rounded-xl text-[12.5px] font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <MapPin className="h-3.5 w-3.5 ml-1.5 inline -mt-0.5" />
              مناطق التغطية
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tasks" className="mt-0 -mx-4 lg:-mx-6">
            <UniversalAdminGrid<Task>
              title=""
              metrics={taskMetrics}
              columns={taskColumns}
              dataSource={taskDataSource}
              searchPlaceholder="ابحث برقم الطلب أو المنطقة..."
              empty={{ icon: Truck, title: "لا توجد مهام نشطة", hint: "ستظهر مهام التوصيل الجديدة هنا" }}
            />
          </TabsContent>

          <TabsContent value="drivers" className="mt-0 -mx-4 lg:-mx-6">
            <UniversalAdminGrid<Driver>
              title=""
              metrics={driverMetrics}
              columns={driverColumns}
              dataSource={driverDataSource}
              searchPlaceholder="ابحث باسم المندوب أو الهاتف..."
              empty={{ icon: UserCheck, title: "لا يوجد مناديب", hint: "أضف المناديب من إعدادات الفريق" }}
            />
          </TabsContent>

          <TabsContent value="zones" className="mt-0 -mx-4 lg:-mx-6">
            <UniversalAdminGrid<Zone>
              title=""
              metrics={zoneMetrics}
              columns={zoneColumns}
              dataSource={zoneDataSource}
              searchPlaceholder="ابحث بالمنطقة أو المنتج..."
              empty={{ icon: MapPin, title: "لا توجد قواعد تغطية", hint: "أضف قواعد لتحديد ما يتوفر في كل منطقة" }}
            />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
