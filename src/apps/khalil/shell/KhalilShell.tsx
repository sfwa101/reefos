/**
 * Khalil — sovereign shell.
 *
 * Mobile-first (390px reference) RTL layout. Hosts <Outlet/> for nested
 * Khalil routes. Registers Khalil blocks with the shared registry on
 * mount. No business logic — pure structural shell.
 */
import { useEffect } from "react";
import { Outlet } from "@tanstack/react-router";
import { registerKhalilBlocks } from "../blocks/register";
import { KhalilBottomNav } from "./BottomNav";

export function KhalilShell() {
  useEffect(() => {
    registerKhalilBlocks();
  }, []);

  return (
    <div dir="rtl" className="relative min-h-screen bg-background text-foreground">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[360px] bg-gradient-to-b from-primary/10 via-primary/5 to-transparent blur-3xl" />
      <main className="relative mx-auto w-full max-w-md px-4 pb-28 pt-6">
        <Outlet />
      </main>
      <KhalilBottomNav />
    </div>
  );
}
