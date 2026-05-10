import { Outlet } from "@tanstack/react-router";
import { DesktopSidebar } from "./DesktopSidebar";
import { DesktopTopbar } from "./DesktopTopbar";
import { BottomTabBar } from "./BottomTabBar";
import { HakimFAB } from "./HakimFAB";
import { SmartActionComposer } from "./SmartActionComposer";

/**
 * AdminShell — Phase 66.x Command Cortex (rebuilt).
 *
 * Layer stack:
 *  • SovereignTopbar (DesktopTopbar) — fixed top, all viewports, hosts the
 *    Notch (centre), Back-to-Store (right in RTL), Bell + Avatar (left).
 *  • DesktopSidebar — desktop only side rail.
 *  • BottomTabBar — fixed bottom-center dock, all viewports, z-40.
 *  • SmartActionComposer (+) — floating mobile FAB (bottom-28 right-4, z-50)
 *    + inline desktop button (rendered by composer itself).
 *  • HakimFAB — floating coach (bottom-28 left-4 mobile, z-50).
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
        <main className="flex-1 min-w-0 pt-20 pb-32">
          <Outlet />
        </main>
      </div>

      {/* Floating layers — not duplicated inside the topbar */}
      <SmartActionComposer />
      <BottomTabBar />
      <HakimFAB />
    </div>
  );
}
