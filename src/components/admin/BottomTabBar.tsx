/**
 * Phase 66.1 — Adaptive Bottom Tab Bar.
 *
 * Mobile equivalent of `DesktopSidebar`. Pulls 5 capability-filtered items
 * from `buildBottomTabsForKind(activeWorkspaceKind)` and the live
 * capability set, so the bar morphs whenever the user switches workspace.
 */
import { Link, useLocation } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { useSovereignContext } from "@/core-os/capabilities/store/useSovereignContext";
import { useCapabilities } from "@/hooks/useCapability";
import { useUserRoles } from "@/hooks/useUserRoles";
import { buildBottomTabsForKind } from "./nav/workspaceNav";

export function BottomTabBar() {
  const { pathname } = useLocation();
  const { activeWorkspaceKind } = useSovereignContext();
  const { capabilities } = useCapabilities();
  const { roles } = useUserRoles();
  const isAdmin = roles.some((r) => r === "admin");

  const tabs = buildBottomTabsForKind(activeWorkspaceKind)
    .filter((t) => !t.cap || isAdmin || capabilities.has(t.cap))
    .slice(0, 5);

  if (tabs.length === 0) return null;

  return (
    <nav
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 glass-strong border-t border-border/50"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul
        className="grid px-1 pt-1.5 pb-1"
        style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
      >
        {tabs.map(({ to, icon: Icon, label, exact }) => {
          const isActive = exact ? pathname === to : pathname === to || pathname.startsWith(to + "/");
          return (
            <li key={to}>
              <Link
                to={to}
                className={cn(
                  "flex flex-col items-center gap-0.5 py-1.5 rounded-2xl press transition-base",
                  isActive ? "text-primary" : "text-foreground-tertiary",
                )}
              >
                <div className={cn("h-7 w-12 rounded-xl flex items-center justify-center transition-base", isActive && "bg-primary/10")}>
                  <Icon className="h-[22px] w-[22px]" strokeWidth={isActive ? 2.5 : 2} />
                </div>
                <span className={cn("text-[10px] leading-none truncate max-w-full px-1", isActive && "font-semibold")}>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
