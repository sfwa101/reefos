import { KpiCard } from "@/components/admin/ui";
import { useHakimPulse, type PulseTile } from "@/hooks/useHakimPulse";
import { fmtMoney, fmtNum } from "@/lib/format";
import { TrendingUp, ShoppingBag, Users, AlertTriangle } from "lucide-react";

type Props = {
  todayRevenue: number;
  yesterdayTotal: number;
  dayDelta: number;
  todayOrders: number;
  inDelivery: number;
  totalCustomers: number;
  lowStock: number;
};

export function SmartKpiStrip({
  todayRevenue,
  yesterdayTotal,
  dayDelta,
  todayOrders,
  inDelivery,
  totalCustomers,
  lowStock,
}: Props) {
  const tiles: PulseTile[] = [
    { key: "revenue", label: "إيرادات اليوم", value: todayRevenue },
    { key: "orders", label: "طلبات اليوم", value: todayOrders },
    { key: "customers", label: "إجمالي العملاء", value: totalCustomers },
    { key: "lowStock", label: "مخزون منخفض", value: lowStock },
  ];
  const { insights } = useHakimPulse("dashboard", tiles);

  return (
    <div className="grid grid-cols-2 xl:grid-cols-2 2xl:grid-cols-4 gap-4">
      <KpiCard
        label="إيرادات اليوم"
        value={fmtMoney(todayRevenue)}
        hint={`أمس: ${fmtMoney(yesterdayTotal)}`}
        delta={dayDelta}
        icon={TrendingUp}
        tone="success"
        to="/admin/orders"
        insight={insights.revenue?.text}
        insightTone={insights.revenue?.tone}
      />
      <KpiCard
        label="طلبات اليوم"
        value={fmtNum(todayOrders)}
        hint={`نشطة: ${fmtNum(inDelivery)}`}
        icon={ShoppingBag}
        tone="primary"
        to="/admin/orders"
        insight={insights.orders?.text}
        insightTone={insights.orders?.tone}
      />
      <KpiCard
        label="إجمالي العملاء"
        value={fmtNum(totalCustomers)}
        icon={Users}
        tone="info"
        to="/admin/customers"
        insight={insights.customers?.text}
        insightTone={insights.customers?.tone}
      />
      <KpiCard
        label="مخزون منخفض"
        value={fmtNum(lowStock)}
        hint="منتج يحتاج تجديد"
        icon={AlertTriangle}
        tone="warning"
        to="/admin/low-stock"
        urgent={lowStock > 0}
        insight={insights.lowStock?.text}
        insightTone={insights.lowStock?.tone}
      />
    </div>
  );
}

export default SmartKpiStrip;
