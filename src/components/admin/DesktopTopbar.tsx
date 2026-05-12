import { Link } from "@tanstack/react-router";
import { Bell, Store } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/context/AuthContext";
import { countUnreadNotificationsFn } from "@/lib/notifications.functions";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * SovereignTopbar — Phase 66.x unified shell topbar.
 *
 * Visible on ALL viewports (mobile + desktop). Three zones:
 *  • Left   → "Back to Store" (customer view) link.
 *  • Center → WorkspaceSwitcher (the Notch), absolutely centred so it never
 *             pushes side actions around.
 *  • Right  → Notifications bell + profile avatar.
 *
 * The SmartActionComposer (+) lives separately as a floating FAB on mobile
 * and may be re-mounted in shell on desktop if needed; not duplicated here.
 */
export function DesktopTopbar() {
  const { profile, user } = useAuth();
  const display = profile?.full_name ?? user?.email ?? "؟";
  const initials = display.trim().split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  const fetchUnread = useServerFn(countUnreadNotificationsFn);
  const { data } = useQuery({
    queryKey: ["admin", "notifications-unread"],
    queryFn: () => fetchUnread(),
    staleTime: 60_000,
  });
  const unread = data?.unread ?? 0;

  return (
    <header
      className="fixed top-0 inset-x-0 z-40 h-16 px-4 flex items-center justify-between bg-background/80 backdrop-blur-md border-b border-border/40"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
      dir="rtl"
    >
      {/* RIGHT (in RTL: visually right) — Back to Store */}
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              to="/"
              aria-label="واجهة العميل"
              className="h-10 w-10 rounded-2xl flex items-center justify-center hover:bg-surface-muted press border border-border/40"
            >
              <Store className="h-[18px] w-[18px] text-foreground-secondary" />
            </Link>
          </TooltipTrigger>
          <TooltipContent side="bottom">واجهة العميل</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* CENTER — Sovereign Notch (absolute centred) */}
      <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2">
        <WorkspaceSwitcher />
      </div>

      {/* LEFT (in RTL: visually left) — Bell + Avatar */}
      <div className="flex items-center gap-1.5">
        <Link
          to="/admin/marketing/notifications"
          className="relative h-10 w-10 rounded-2xl hover:bg-surface-muted flex items-center justify-center press"
          aria-label="الإشعارات"
        >
          <Bell className="h-[18px] w-[18px] text-foreground-secondary" />
          {unread > 0 && (
            <span className="absolute top-1.5 left-1.5 min-w-[16px] h-[16px] px-1 rounded-full bg-destructive text-destructive-foreground text-[9.5px] font-semibold flex items-center justify-center ring-2 ring-card">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </Link>
        <Link
          to="/admin/settings"
          className="flex items-center gap-2 h-10 pr-1 pl-2 rounded-2xl hover:bg-surface-muted press"
          aria-label="الملف الشخصي"
        >
          <Avatar className="h-8 w-8 border border-border/40">
            <AvatarFallback className="bg-gradient-primary text-primary-foreground text-[11px] font-display">
              {initials || "؟"}
            </AvatarFallback>
          </Avatar>
        </Link>
      </div>
    </header>
  );
}
