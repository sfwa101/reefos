/**
 * BusinessOpsDashboard navs were previously hardcoded inside AdminShell.
 * This module exposes per-OS-Company navigation so the sidebar swaps
 * between the Motherboard ("global") and child ERPs at runtime.
 */
import {
  Activity,
  BarChart3,
  Box,
  Compass,
  LayoutDashboard,
  Library,
  Megaphone,
  Package,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Users,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { OSCompanyId } from "@/core/identity/osCompanies";

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
  { to: "/admin/settings", label: "الإعدادات", icon: Settings },
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

export function getPrimaryNav(id: OSCompanyId): NavItem[] {
  return id === "global" ? OS_NAV : ERP_NAV;
}

export function getBottomNav(id: OSCompanyId): NavItem[] {
  return id === "global" ? OS_BOTTOM : ERP_BOTTOM;
}
