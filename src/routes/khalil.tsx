import { createFileRoute } from "@tanstack/react-router";
import { KhalilShell } from "@/apps/khalil/shell/KhalilShell";

/**
 * Khalil — sovereign layout route.
 *
 * Mounts the Khalil shell + bottom nav and renders nested routes via
 * <Outlet/>. Per ADR-0004 / p1-mobile-first.md.
 */
export const Route = createFileRoute("/khalil")({
  head: () => ({
    meta: [
      { title: "خليل — نظام التحول السيادي" },
      {
        name: "description",
        content:
          "خليل: نظام تشغيل سيادي للتحول الإنساني الموجَّه بالذكاء الاصطناعي داخل منظومة سلسبيل.",
      },
    ],
  }),
  component: KhalilShell,
});
