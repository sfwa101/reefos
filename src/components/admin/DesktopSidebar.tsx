/**
 * Phase 66.1 — Adaptive Sidebar.
 *
 * Replaces the static 75-item mega-menu with a capability-gated, workspace-
 * aware navigation derived from `buildNavForKind(activeWorkspaceKind)` and
 * filtered by `useCapabilities()`. Items without a `cap` are visible to
 * anyone in that workspace; items with a `cap` only render when the active
 * workspace grants it (admins always pass via the Phase 65 bypass).
 */
import { Link, useLocation } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { useSovereignContext } from "@/core-os/capabilities/store/useSovereignContext";
import { useCapabilities } from "@/hooks/useCapability";
import { useUserRoles } from "@/hooks/useUserRoles";
import { buildNavForKind, type NavItem } from "./nav/workspaceNav";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";

function useCanShow() {
  const { capabilities } = useCapabilities();
  const { roles } = useUserRoles();
  const isAdmin = roles.some((r) => r === "admin");
  return (item: NavItem) => !item.cap || isAdmin || capabilities.has(item.cap);
}

export function DesktopSidebar() {
  const { pathname } = useLocation();
  const { activeWorkspaceKind } = useSovereignContext();
  const canShow = useCanShow();
  const groups = buildNavForKind(activeWorkspaceKind)
    .map((g) => ({ ...g, items: g.items.filter(canShow) }))
    .filter((g) => g.items.length > 0);

  return (
    <aside className="hidden lg:flex flex-col w-64 shrink-0 border-l border-border/50 glass-strong shadow-float h-screen sticky top-0 z-30">
      <div className="h-16 flex items-center gap-2.5 px-5 border-b border-sidebar-border">
        <div className="h-9 w-9 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
          <span className="text-primary-foreground font-display text-sm">س</span>
        </div>
        <div className="min-w-0">
          <p className="font-display text-[15px] leading-tight">سَلسَبيل</p>
          <p className="text-[10px] text-foreground-tertiary leading-tight">قُرطُبة الإدارة السيادية</p>
        </div>
      </div>
      <div className="px-3 pt-3 pb-2 border-b border-border/40">
        <WorkspaceSwitcher className="w-full justify-center" />
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5 no-scrollbar">
        {groups.length === 0 && (
          <p className="text-center text-[12px] text-foreground-tertiary py-8">
            لا توجد عناصر متاحة في هذه المساحة
          </p>
        )}
        {groups.map((g) => (
          <div key={g.title}>
            <p className="text-[10px] uppercase tracking-wider font-semibold text-foreground-tertiary px-3 mb-1.5">{g.title}</p>
            <ul className="space-y-0.5">
              {g.items.map((it) => {
                const active = it.exact ? pathname === it.to : pathname === it.to || pathname.startsWith(it.to + "/");
                return (
                  <li key={it.to}>
                    <Link
                      to={it.to}
                      className={cn(
                        "flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-base press",
                        active
                          ? "bg-sidebar-accent text-foreground font-semibold shadow-sm"
                          : "text-foreground-secondary hover:bg-sidebar-accent/60 hover:text-foreground",
                      )}
                    >
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
