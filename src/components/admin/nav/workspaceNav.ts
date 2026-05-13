/**
 * Phase 66.1 — Adaptive Navigation Registry.
 *
 * Single source of truth for sidebar / bottom-nav items, keyed by
 * `WorkspaceKind`. Items can declare an optional `cap` (capability key);
 * the shell filters by it via `useCapabilities()`. Items without a `cap`
 * are visible to anyone in that workspace.
 *
 * Replaces the static 75-item mega-menu in `DesktopSidebar.tsx`.
 */
import {
  Home, ShoppingBag, Package, Users, Wallet, Receipt, BarChart3, Truck,
  Brain, Settings, Layers, Store, Sparkles, Coins, Scale, FileClock,
  GraduationCap, BookOpen, Compass, KeyRound, ShieldCheck, Banknote,
  LayoutGrid,
  type LucideIcon,
} from "lucide-react";
import type { WorkspaceKind } from "@/core-os/capabilities/store/useSovereignContext";

export type NavItem = {
  to: string;
  icon: LucideIcon;
  label: string;
  /** Optional capability gate. If absent → always visible in this kind. */
  cap?: string;
  exact?: boolean;
};

export type NavGroup = { title: string; items: NavItem[] };

/** Items shown in EVERY workspace (overview + system). */
const COMMON: NavGroup[] = [
  { title: "نظرة عامة", items: [
    { to: "/admin", icon: Home, label: "الرئيسية", exact: true },
    { to: "/admin/dashboard", icon: BarChart3, label: "لوحة التشغيل" },
  ]},
];

const SYSTEM: NavGroup = { title: "إعدادات النظام", items: [
  { to: "/admin/system-settings", icon: Settings, label: "الإعدادات", cap: "global.system.manage" },
  { to: "/admin/role-permissions", icon: KeyRound, label: "الصلاحيات", cap: "global.system.manage" },
  { to: "/admin/audit-log", icon: FileClock, label: "سجل العمليات", cap: "global.system.manage" },
]};

const REEF: NavGroup[] = [
  { title: "ريف — العمليات", items: [
    { to: "/admin/orders/", icon: ShoppingBag, label: "الطلبات" },
    { to: "/admin/assets/genesis", icon: Sparkles, label: "منتج جديد بحكيم" },
    { to: "/admin/assets", icon: Package, label: "الأصول" },
    { to: "/admin/hub", icon: LayoutGrid, label: "المحركات" },
    { to: "/admin/stores", icon: Store, label: "المتاجر" },
  ]},
  { title: "ريف — الجمهور", items: [
    { to: "/admin/humans", icon: Users, label: "الشبكة البشرية" },
    { to: "/admin/marketing/promos", icon: Sparkles, label: "العروض" },
    { to: "/admin/delivery", icon: Truck, label: "التوصيل" },
  ]},
];

const TAYSEER: NavGroup[] = [
  { title: "تيسير — المالية", items: [
    { to: "/admin/wallets", icon: Wallet, label: "المحافظ" },
    { to: "/admin/payouts", icon: Banknote, label: "السحوبات" },
    { to: "/admin/expenses", icon: Receipt, label: "المصروفات" },
    { to: "/admin/finance", icon: BarChart3, label: "التقارير" },
    { to: "/admin/cfo", icon: Coins, label: "رؤية CFO" },
  ]},
  { title: "تيسير — الامتثال", items: [
    { to: "/admin/zakat", icon: Scale, label: "الزكاة" },
    { to: "/admin/riba-audit", icon: ShieldCheck, label: "مراجعة الربا" },
  ]},
];

const NOOR: NavGroup[] = [
  { title: "نور الدين — الجامعة", items: [
    { to: "/admin/dashboard", icon: GraduationCap, label: "رحلات التعلم" },
    { to: "/admin/humans", icon: Users, label: "المتعلمون" },
    { to: "/admin/hakim-insights", icon: BookOpen, label: "كتاب الذات" },
    { to: "/admin/personalized-picks", icon: Compass, label: "الإرشاد" },
  ]},
];

const FAMILY: NavGroup[] = [
  { title: "العائلة", items: [
    { to: "/admin/wallets", icon: Wallet, label: "محفظة العائلة" },
    { to: "/admin/humans", icon: Users, label: "الأفراد" },
  ]},
];

const HAKIM: NavGroup = { title: "ذكاء النظام", items: [
  { to: "/admin/hakim", icon: Brain, label: "حكيم" },
  { to: "/admin/hakim-insights", icon: Sparkles, label: "الرؤى" },
]};

export function buildNavForKind(kind: WorkspaceKind): NavGroup[] {
  switch (kind) {
    case "reef":       return [...COMMON, ...REEF, HAKIM, SYSTEM];
    case "tayseer":    return [...COMMON, ...TAYSEER, HAKIM, SYSTEM];
    case "noor_eldin": return [...COMMON, ...NOOR, HAKIM, SYSTEM];
    case "family":     return [...COMMON, ...FAMILY, HAKIM];
    case "global":
    default:           return [...COMMON, ...REEF, ...TAYSEER, HAKIM, SYSTEM];
  }
}

/** Top 5 items for mobile bottom nav, per kind. */
export function buildBottomTabsForKind(kind: WorkspaceKind): NavItem[] {
  const all = buildNavForKind(kind).flatMap((g) => g.items);
  // de-dup by `to`, keep first occurrence
  const seen = new Set<string>();
  const unique = all.filter((it) => (seen.has(it.to) ? false : (seen.add(it.to), true)));
  return unique.slice(0, 5);
}
