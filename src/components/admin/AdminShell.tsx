import { Outlet } from "@tanstack/react-router";
import { DesktopSidebar } from "./DesktopSidebar";
import { DesktopTopbar } from "./DesktopTopbar";
import { BottomTabBar } from "./BottomTabBar";
import { HakimFAB } from "./HakimFAB";
import { SmartActionComposer } from "./SmartActionComposer";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";

/**
 * AdminShell — Phase 66.x Command Cortex.
 *
 * Global fixed layers (visible on EVERY viewport, every admin route):
 *  • The Sovereign Notch — fixed top-center pill (WorkspaceSwitcher), z-50.
 *  • The Bottom Dock — fixed bottom-center adaptive nav (BottomTabBar), z-40.
 *  • Smart Action Composer (+) — floating, owned by the Notch family.
 *  • Hakim FAB — floating coach.
 *
 * Desktop adds the side rail + slim topbar (search/profile only).
 */
export function AdminShell() {
  return (
    <div
      className="min-h-screen flex w-full bg-background relative"
      dir="rtl"
      style={{ background: "var(--gradient-aurora), hsl(var(--background))" }}
    >
      <DesktopSidebar />
      <div className="flex-1 min-w-0 flex flex-col">
        <DesktopTopbar />
        <main className="flex-1 min-w-0 pt-16 pb-24">
          <Outlet />
        </main>
      </div>

      {/* Sovereign Notch — fixed top-center, all viewports */}
      <div
        className="fixed top-3 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="pointer-events-auto flex items-center gap-2">
          <WorkspaceSwitcher />
          <SmartActionComposer />
        </div>
      </div>

      {/* Bottom Dock — fixed bottom-center, all viewports */}
      <BottomTabBar />

      <HakimFAB />
    </div>
  );
}
