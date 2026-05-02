import { Link, useLocation } from "@tanstack/react-router";
import {
  Home, ShoppingBag, Package, Users, ShieldCheck, Wallet, Receipt, TrendingUp,
  Sparkles, Image, BellRing, Gift, Truck, MapPin, UserCog, MessagesSquare,
  Star, BarChart3, Settings, FileClock, Warehouse, Store, Printer, FolderTree, Layout, Banknote,
  Boxes, Layers, ArrowRightLeft, Coins, KeyRound,
  HandCoins, ClipboardList, PiggyBank,
  Scale, Ban, MessageCircle, AlertTriangle, Globe, Sliders,
} from "lucide-react";
import { cn } from "@/lib/utils";

const groups = [
  { title: "نظرة عامة", items: [
    { to: "/admin", icon: Home, label: "الرئيسية", exact: true },
    { to: "/admin/dashboard", icon: BarChart3, label: "لوحة التشغيل" },
    { to: "/admin/analytics", icon: BarChart3, label: "التحليلات" },
    { to: "/admin/executive", icon: TrendingUp, label: "اللوحة التنفيذية" },
  ]},
  { title: "العمليات", items: [
    { to: "/admin/orders", icon: ShoppingBag, label: "الطلبات" },
    { to: "/admin/products", icon: Package, label: "المنتجات" },
    { to: "/admin/categories", icon: FolderTree, label: "الفئات" },
    { to: "/admin/product-units", icon: Boxes, label: "وحدات المنتجات" },
    { to: "/admin/offers", icon: Gift, label: "العروض والكوبونات" },
    { to: "/admin/print-jobs", icon: Printer, label: "طلبات الطباعة" },
    { to: "/admin/stores", icon: Store, label: "المتاجر" },
    { to: "/admin/branches", icon: Globe, label: "الفروع الدولية" },
  ]},
  { title: "المخزون واللوجستيات", items: [
    { to: "/admin/inventory", icon: Warehouse, label: "المخزون والأسعار" },
    { to: "/admin/inventory-locations", icon: Boxes, label: "مواقع المخزون" },
    { to: "/admin/warehouses", icon: Warehouse, label: "المخازن المتعددة" },
    { to: "/admin/product-batches", icon: Layers, label: "دفعات المنتجات (FEFO)" },
    { to: "/admin/cross-branch-transfers", icon: ArrowRightLeft, label: "التحويلات بين الفروع" },
    { to: "/admin/allocation", icon: MapPin, label: "التوزيع الذكي" },
    { to: "/admin/low-stock", icon: AlertTriangle, label: "تنبيهات المخزون" },
    { to: "/admin/cost-bulk", icon: Receipt, label: "تعبئة التكاليف" },
  ]},
  { title: "العملاء", items: [
    { to: "/admin/customers", icon: Users, label: "العملاء" },
    { to: "/admin/kyc", icon: ShieldCheck, label: "التحقق KYC" },
    { to: "/admin/reviews", icon: Star, label: "التقييمات" },
  ]},
  { title: "الشركاء والتجار", items: [
    { to: "/admin/vendors", icon: Truck, label: "التجار والموردون" },
    { to: "/admin/suppliers", icon: Truck, label: "الموردون" },
    { to: "/admin/partners", icon: Star, label: "شركاء المنتجات" },
    { to: "/admin/purchases", icon: Receipt, label: "فواتير المشتريات" },
  ]},
  { title: "المالية والمحافظ", items: [
    { to: "/admin/wallets", icon: Wallet, label: "المحافظ" },
    { to: "/admin/payouts", icon: Banknote, label: "طلبات السحب" },
    { to: "/admin/topup-approvals", icon: ShieldCheck, label: "موافقات الشحن" },
    { to: "/admin/advance-approvals", icon: ShieldCheck, label: "موافقات السلف" },
    { to: "/admin/payments-schedule", icon: FileClock, label: "جدولة المدفوعات" },
    { to: "/admin/expenses", icon: Receipt, label: "المصروفات" },
    { to: "/admin/commission-ledger", icon: Coins, label: "سجل العمولات" },
    { to: "/admin/affiliate-settings", icon: Sliders, label: "عمولات الأفلييت" },
    { to: "/admin/savings", icon: Receipt, label: "الادخار" },
    { to: "/admin/finance", icon: TrendingUp, label: "التقارير المالية" },
    { to: "/admin/cfo", icon: TrendingUp, label: "الرؤية المالية CFO" },
  ]},
  { title: "تسويات وعمليات نقدية", items: [
    { to: "/admin/cashier-sessions", icon: ClipboardList, label: "ورديات الكاشير" },
    { to: "/admin/vendor-settlements", icon: Receipt, label: "تسويات التجار" },
    { to: "/admin/driver-cash-settlements", icon: HandCoins, label: "تسويات المناديب" },
    { to: "/admin/driver-settlements", icon: Wallet, label: "تصفية العهدة" },
    { to: "/admin/store-settlements", icon: PiggyBank, label: "تسويات الفروع" },
  ]},
  { title: "الامتثال الشرعي وحكيم AI", items: [
    { to: "/admin/hakim", icon: Sparkles, label: "المستشار حكيم AI" },
    { to: "/admin/hakim-chat", icon: MessageCircle, label: "محادثة حكيم" },
    { to: "/admin/zakat", icon: Scale, label: "حساب الزكاة" },
    { to: "/admin/riba-audit", icon: Ban, label: "مراجعة الربا" },
    { to: "/admin/charity", icon: Gift, label: "حاسبة الصدقات" },
  ]},
  { title: "التسويق", items: [
    { to: "/admin/marketing/promos", icon: Sparkles, label: "الكوبونات" },
    { to: "/admin/marketing/banners", icon: Image, label: "البانرات" },
    { to: "/admin/marketing/notifications", icon: BellRing, label: "الإشعارات" },
    { to: "/admin/marketing/referrals", icon: Gift, label: "الإحالات" },
  ]},
  { title: "التوصيل والمناديب", items: [
    { to: "/admin/delivery", icon: Truck, label: "مهام التوصيل" },
    { to: "/admin/drivers", icon: Truck, label: "المناديب" },
    { to: "/admin/delivery/zones", icon: MapPin, label: "المناطق" },
    { to: "/admin/delivery-settings", icon: Sliders, label: "إعدادات التوصيل" },
  ]},
  { title: "إعداد المتجر", items: [
    { to: "/admin/design", icon: Layout, label: "محرر التصميم" },
  ]},
  { title: "إعدادات النظام", items: [
    { to: "/admin/staff", icon: UserCog, label: "الموظفون" },
    { to: "/admin/role-permissions", icon: KeyRound, label: "مصفوفة الصلاحيات" },
    { to: "/admin/support", icon: MessagesSquare, label: "الدعم" },
    { to: "/admin/audit-log", icon: FileClock, label: "سجل العمليات" },
    { to: "/admin/settings", icon: Settings, label: "الإعدادات" },
  ]},
];

export function DesktopSidebar() {
  const { pathname } = useLocation();
  return (
    <aside className="hidden lg:flex flex-col w-64 shrink-0 border-l border-border/50 glass-strong shadow-float h-screen sticky top-0 z-30">
      <div className="h-16 flex items-center gap-2.5 px-5 border-b border-sidebar-border">
        <div className="h-9 w-9 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
          <span className="text-primary-foreground font-display text-sm">ر</span>
        </div>
        <div>
          <p className="font-display text-[15px] leading-tight">ريف المدينة</p>
          <p className="text-[10px] text-foreground-tertiary leading-tight">لوحة الإدارة ERP</p>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5 no-scrollbar">
        {groups.map((g) => (
          <div key={g.title}>
            <p className="text-[10px] uppercase tracking-wider font-semibold text-foreground-tertiary px-3 mb-1.5">{g.title}</p>
            <ul className="space-y-0.5">
              {g.items.map((it) => {
                const active = it.exact ? pathname === it.to : pathname === it.to || pathname.startsWith(it.to + "/");
                return (
                  <li key={it.to}>
                    <Link to={it.to} className={cn(
                      "flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-base press",
                      active ? "bg-sidebar-accent text-foreground font-semibold shadow-sm"
                             : "text-foreground-secondary hover:bg-sidebar-accent/60 hover:text-foreground"
                    )}>
                      <it.icon className={cn("h-[18px] w-[18px]", active && "text-primary")} strokeWidth={active ? 2.5 : 2} />
                      {it.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </aside>
  );
}
