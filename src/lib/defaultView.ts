import type { AppRole } from "@/hooks/useUserRole";

export const ACTIVE_VIEW_KEY = "reef.activeView";

export type ActiveView = "customer" | "delivery" | "vendor" | "admin" | "cashier" | "staff";

export const VIEW_PATHS: Record<ActiveView, string> = {
  customer: "/",
  delivery: "/driver",
  vendor: "/vendor",
  admin: "/admin",
  cashier: "/pos",
  staff: "/employee",
};

export function pickDefaultView(
  roles: NonNullable<AppRole>[],
  saved: string | null,
): ActiveView {
  if (saved && saved in VIEW_PATHS) return saved as ActiveView;
  if (roles.includes("delivery")) return "delivery";
  if (roles.includes("vendor")) return "vendor";
  if (roles.some((r) => ["admin", "branch_manager", "store_manager", "finance"].includes(r))) return "admin";
  if (roles.includes("cashier")) return "cashier";
  if (roles.includes("staff")) return "staff";
  return "customer";
}

export function readActiveView(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(ACTIVE_VIEW_KEY);
  } catch {
    return null;
  }
}

export function writeActiveView(view: ActiveView): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ACTIVE_VIEW_KEY, view);
  } catch {
    /* noop */
  }
}
