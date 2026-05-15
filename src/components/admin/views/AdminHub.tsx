/**
 * AdminHub — Sovereign Admin Hub (Apple-style premium grouped navigation).
 *
 * Pure presentation: zero DB / RPC / Supabase imports. Constitutional
 * Article 5 compliant. Renders all admin destinations grouped into
 * 8 clusters with a client-side fuzzy search.
 */
import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ChevronLeft, Search, X,
  // Operations
  ShoppingBag, Package, Layers, Sparkles, Boxes, MapPin, AlertTriangle,
  Repeat, ClipboardList, Tags, Truck, Settings2, Printer,
  // Commerce & Audience
  Store, Building2, Users, UserCog, Star, MessageSquare, Compass,
  // Marketing
  Megaphone, Image as ImageIcon, Bell, Share2, Gift, HeartHandshake,
  // Finance
  Wallet, Banknote, Receipt, BarChart3, BookOpen, Coins, LineChart,
  PiggyBank, CalendarClock, FileText, Tag, Percent, HandCoins, Handshake,
  Users2, Building, Car, ScrollText, Inbox,
  // HR
  UserCheck, Clock, CheckSquare, ShoppingCart, ShieldCheck,
  // Compliance & Sovereign
  Scale, Vault, Activity, FileClock, Eye, KeyRound,
  // Hakim & Intelligence
  Brain, MessageCircle, Lightbulb, AlertOctagon, Wrench, TrendingUp, Gauge,
  SlidersHorizontal,
  // System
  Settings, Sliders, Palette,
  type LucideIcon,
} from "lucide-react";

type HubItem = { to: string; label: string; icon: LucideIcon };
type HubCluster = { id: string; title: string; items: HubItem[] };

const CLUSTERS: HubCluster[] = [
  {
    id: "ops",
    title: "العمليات",
    items: [
      { to: "/admin/orders/", label: "الطلبات", icon: ShoppingBag },
      { to: "/admin/assets", label: "المنتجات والأصول", icon: Layers },
      { to: "/admin/products/new", label: "منتج جديد بحكيم", icon: Sparkles },
      { to: "/admin/inventory-locations", label: "مواقع المخزون", icon: MapPin },
      { to: "/admin/low-stock", label: "نقص المخزون", icon: AlertTriangle },
      { to: "/admin/cross-branch-transfers", label: "تحويلات بين الفروع", icon: Repeat },
      { to: "/admin/allocation", label: "مراقبة التخصيص", icon: ClipboardList },
      { to: "/admin/categories", label: "التصنيفات", icon: Tags },
      { to: "/admin/delivery", label: "التوصيل", icon: Truck },
      { to: "/admin/delivery-settings", label: "إعدادات التوصيل", icon: Settings2 },
      { to: "/admin/print-jobs", label: "مهام الطباعة", icon: Printer },
    ],
  },
  {
    id: "commerce",
    title: "التجارة والجمهور",
    items: [
      { to: "/admin/stores", label: "المتاجر", icon: Store },
      { to: "/admin/branches", label: "الفروع", icon: Building2 },
      { to: "/admin/customers", label: "العملاء", icon: Users },
      { to: "/admin/humans", label: "الشبكة البشرية", icon: UserCog },
      { to: "/admin/reviews", label: "التقييمات", icon: Star },
      { to: "/admin/support", label: "الدعم", icon: MessageSquare },
      { to: "/admin/personalized-picks", label: "اقتراحات مخصصة", icon: Compass },
    ],
  },
  {
    id: "marketing",
    title: "التسويق",
    items: [
      { to: "/admin/marketing", label: "مركز التسويق", icon: Megaphone },
      { to: "/admin/marketing/banners", label: "البانرات", icon: ImageIcon },
      { to: "/admin/marketing/promos", label: "العروض الترويجية", icon: Sparkles },
      { to: "/admin/marketing/notifications", label: "الإشعارات", icon: Bell },
      { to: "/admin/marketing/referrals", label: "الإحالات", icon: Share2 },
      { to: "/admin/offers", label: "العروض", icon: Gift },
      { to: "/admin/affiliate-settings", label: "إعدادات الشراكة", icon: HeartHandshake },
    ],
  },
  {
    id: "finance",
    title: "المالية",
    items: [
      { to: "/admin/wallets", label: "المحافظ", icon: Wallet },
      { to: "/admin/payouts", label: "السحوبات", icon: Banknote },
      { to: "/admin/expenses", label: "المصروفات", icon: Receipt },
      { to: "/admin/finance", label: "تقارير المالية", icon: BarChart3 },
      { to: "/admin/finance/ledger", label: "دفتر الأستاذ", icon: BookOpen },
      { to: "/admin/cfo", label: "رؤية CFO", icon: Coins },
      { to: "/admin/executive", label: "لوحة التنفيذي", icon: LineChart },
      { to: "/admin/savings", label: "الادخار", icon: PiggyBank },
      { to: "/admin/payments-schedule", label: "جدولة الدفعات", icon: CalendarClock },
      { to: "/admin/purchases", label: "فواتير الشراء", icon: FileText },
      { to: "/admin/cost-bulk", label: "تحديث التكاليف", icon: Tag },
      { to: "/admin/discount-overrides", label: "تجاوزات الخصم", icon: Percent },
      { to: "/admin/commission-ledger", label: "دفتر العمولات", icon: HandCoins },
      { to: "/admin/partner-ledgers", label: "دفاتر الشركاء", icon: Handshake },
      { to: "/admin/partners", label: "الشركاء", icon: Users2 },
      { to: "/admin/suppliers", label: "الموردون", icon: Building },
      { to: "/admin/driver-settlements", label: "تسويات السائقين", icon: Car },
      { to: "/admin/driver-cash-settlements", label: "نقدية السائقين", icon: Coins },
      { to: "/admin/store-settlements", label: "تسويات المتاجر", icon: Store },
      { to: "/admin/topup-approvals", label: "اعتمادات الشحن", icon: Inbox },
    ],
  },
  {
    id: "hr",
    title: "الموارد البشرية",
    items: [
      { to: "/admin/staff", label: "الموظفون", icon: UserCheck },
      { to: "/admin/staff-attendance", label: "الحضور", icon: Clock },
      { to: "/admin/staff-advances", label: "السلف", icon: Wallet },
      { to: "/admin/advance-approvals", label: "اعتمادات السلف", icon: CheckSquare },
      { to: "/admin/cashier-sessions", label: "جلسات الكاشير", icon: ShoppingCart },
      { to: "/admin/kyc", label: "التحقق KYC", icon: ShieldCheck },
    ],
  },
  {
    id: "compliance",
    title: "الامتثال والسيادة",
    items: [
      { to: "/admin/zakat", label: "الزكاة", icon: Scale },
      { to: "/admin/charity", label: "الصدقات", icon: HeartHandshake },
      { to: "/admin/riba-audit", label: "مراجعة الربا", icon: ShieldCheck },
      { to: "/admin/sovereign-treasury", label: "الخزانة السيادية", icon: Vault },
      { to: "/admin/control-plane", label: "لوحة التحكم", icon: Activity },
      { to: "/admin/tracing", label: "التتبع", icon: FileClock },
      { to: "/admin/profit-observation", label: "غرفة مراقبة الأرباح", icon: Eye },
      { to: "/admin/audit-log", label: "سجل العمليات", icon: FileClock },
      { to: "/admin/role-permissions", label: "الصلاحيات", icon: KeyRound },
    ],
  },
  {
    id: "hakim",
    title: "حكيم والذكاء",
    items: [
      { to: "/admin/hakim", label: "حكيم", icon: Brain },
      { to: "/admin/hakim-chat", label: "محادثة حكيم", icon: MessageCircle },
      { to: "/admin/hakim-insights", label: "رؤى حكيم", icon: Lightbulb },
      { to: "/admin/hakim-anomalies", label: "اكتشاف الشذوذ", icon: AlertOctagon },
      { to: "/admin/hakim-engineer", label: "حكيم المهندس", icon: Wrench },
      { to: "/admin/category-affinity", label: "تقارب التصنيفات", icon: TrendingUp },
      { to: "/admin/analytics", label: "التحليلات", icon: BarChart3 },
      { to: "/admin/dashboard", label: "لوحة التشغيل", icon: Gauge },
      { to: "/admin/business-rules", label: "قواعد العمل", icon: SlidersHorizontal },
    ],
  },
  {
    id: "system",
    title: "النظام",
    items: [
      { to: "/admin/settings", label: "الإعدادات", icon: Settings },
      { to: "/admin/system-settings", label: "إعدادات النظام", icon: Sliders },
      { to: "/admin/design", label: "محرر التصميم", icon: Palette },
    ],
  },
];

function HubRow({ item }: { item: HubItem }) {
  const Icon = item.icon;
  return (
    <Link
      to={item.to}
      className="flex items-center gap-3 px-4 py-3 press transition-base active:bg-surface-muted/60 hover:bg-surface-muted/40"
    >
      <div className="h-9 w-9 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
        <Icon className="h-[18px] w-[18px]" strokeWidth={2.2} />
      </div>
      <span className="flex-1 text-[15px] font-medium truncate">{item.label}</span>
      <ChevronLeft className="h-4 w-4 text-foreground-tertiary shrink-0" />
    </Link>
  );
}

function HubGroup({ cluster }: { cluster: HubCluster }) {
  if (cluster.items.length === 0) return null;
  return (
    <section
      aria-label={cluster.title}
      className="rounded-3xl bg-surface/80 backdrop-blur border border-border/40 shadow-elegant overflow-hidden"
    >
      <header className="px-4 py-3 text-[12px] text-foreground-tertiary font-semibold uppercase tracking-wider">
        {cluster.title}
      </header>
      <div className="divide-y divide-border/30">
        {cluster.items.map((item) => (
          <HubRow key={item.to + item.label} item={item} />
        ))}
      </div>
    </section>
  );
}

export default function AdminHub() {
  const [query, setQuery] = useState("");

  const filtered = useMemo<HubCluster[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return CLUSTERS;
    return CLUSTERS.map((c) => ({
      ...c,
      items: c.items.filter(
        (i) => i.label.toLowerCase().includes(q) || i.to.toLowerCase().includes(q),
      ),
    })).filter((c) => c.items.length > 0);
  }, [query]);

  return (
    <main dir="rtl" className="min-h-dvh bg-background pb-32">
      <header className="sticky top-0 z-20 glass-strong border-b border-border/40">
        <div className="max-w-2xl mx-auto px-4 pt-3 pb-3 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h1 className="font-display text-[22px]">المحركات</h1>
            <span className="text-[12px] text-foreground-tertiary">
              {CLUSTERS.reduce((acc, c) => acc + c.items.length, 0)} محركًا
            </span>
          </div>
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-tertiary" />
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ابحث في المحركات…"
              className="w-full h-11 pr-10 pl-10 rounded-2xl bg-surface-muted/70 border border-border/40 text-[14px] outline-none focus:border-primary/40 focus:bg-surface transition-base"
              aria-label="ابحث في المحركات"
            />
            {query && (
              <Button
                type="button"
                onClick={() => setQuery("")}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-tertiary press"
                aria-label="مسح البحث"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="px-4 pt-5 space-y-5 max-w-2xl mx-auto">
        {filtered.length === 0 ? (
          <div className="rounded-3xl bg-surface/60 border border-border/40 p-8 text-center text-foreground-tertiary text-[14px]">
            لا توجد نتائج مطابقة لبحثك
          </div>
        ) : (
          filtered.map((cluster) => <HubGroup key={cluster.id} cluster={cluster} />)
        )}
      </div>
    </main>
  );
}
