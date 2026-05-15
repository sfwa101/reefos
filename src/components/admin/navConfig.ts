/**
 * BusinessOpsDashboard navs were previously hardcoded inside AdminShell.
 * This module exposes per-OS-Company navigation so the sidebar swaps
 * between the Motherboard ("global"), child ERPs, and — for Reef Al Madina
 * specifically — between operational ERP and the App Factory persona.
 */
import {
  Activity,
  AppWindow,
  BarChart3,
  Blocks,
  Box,
  Compass,
  Factory,
  Layers3,
  LayoutDashboard,
  Library,
  Megaphone,
  MonitorSmartphone,
  Package,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Store,
  Truck,
  Users,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { OSCompanyId } from "@/core/identity/osCompanies";
import type { ReefMode } from "@/core/identity/useReefMode";

export type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
};

const ERP_NAV: NavItem[] = [
  { to: "/admin", label: "اللوحة", icon: LayoutDashboard },
  { to: "/admin/orders", label: "الطلبات", icon: ShoppingBag },
  { to: "/admin/customers", label: "العملاء", icon: Users },
  { to: "/admin/inventory", label: "المخزون", icon: Package },
  { to: "/admin/marketing", label: "التسويق", icon: Megaphone },
  { to: "/admin/finance", label: "المالية", icon: Wallet },
  { to: "/admin/analytics", label: "التحليلات", icon: BarChart3 },
  { to: "/admin/settings", label: "الإعدادات", icon: Settings },
];

const ERP_BOTTOM: NavItem[] = [
  { to: "/admin", label: "اللوحة", icon: LayoutDashboard },
  { to: "/admin/orders", label: "الطلبات", icon: ShoppingBag },
  { to: "/admin/customers", label: "العملاء", icon: Users },
  { to: "/admin/inventory", label: "المخزون", icon: Box },
  { to: "/admin/modules", label: "الوحدات والمحركات", icon: Layers3 },
];

const REEF_FACTORY_NAV: NavItem[] = [
  { to: "/admin/factory", label: "المصنع", icon: Factory },
  { to: "/admin/factory/merchants", label: "التجار", icon: Store },
  { to: "/admin/factory/cashiers", label: "لوحات الكاشير", icon: MonitorSmartphone },
  { to: "/admin/factory/drivers", label: "السائقون", icon: Truck },
  { to: "/admin/factory/apps", label: "التطبيقات", icon: AppWindow },
  { to: "/admin/factory/modules", label: "وحدات ريف", icon: Blocks },
  { to: "/admin/settings", label: "الإعدادات", icon: Settings },
];

const REEF_FACTORY_BOTTOM: NavItem[] = [
  { to: "/admin/factory", label: "المصنع", icon: Factory },
  { to: "/admin/factory/merchants", label: "التجار", icon: Store },
  { to: "/admin/factory/cashiers", label: "كاشير", icon: MonitorSmartphone },
  { to: "/admin/factory/drivers", label: "سائقون", icon: Truck },
  { to: "/admin/modules", label: "الوحدات", icon: Layers3 },
];

const OS_NAV: NavItem[] = [
  { to: "/admin/os", label: "OS Home", icon: Compass },
  { to: "/admin/os", label: "Modules · DNA", icon: Sparkles },
  { to: "/admin/analytics", label: "Insights", icon: Activity },
  { to: "/admin/control-plane", label: "Governance", icon: ShieldCheck },
  { to: "/admin/library", label: "Knowledge", icon: Library },
  { to: "/admin/finance", label: "Treasury", icon: Wallet },
  { to: "/admin/settings", label: "System", icon: Settings },
];

const OS_BOTTOM: NavItem[] = [
  { to: "/admin/os", label: "OS", icon: Compass },
  { to: "/admin/analytics", label: "Insights", icon: Activity },
  { to: "/admin/control-plane", label: "Govern", icon: ShieldCheck },
  { to: "/admin/library", label: "Library", icon: Library },
  { to: "/admin/settings", label: "System", icon: Settings },
];

export function getPrimaryNav(id: OSCompanyId, reefMode: ReefMode = "erp"): NavItem[] {
  if (id === "global") return OS_NAV;
  if (id === "reef" && reefMode === "factory") return REEF_FACTORY_NAV;
  return ERP_NAV;
}

export function getBottomNav(id: OSCompanyId, reefMode: ReefMode = "erp"): NavItem[] {
  if (id === "global") return OS_BOTTOM;
  if (id === "reef" && reefMode === "factory") return REEF_FACTORY_BOTTOM;
  return ERP_BOTTOM;
}
