import { createFileRoute } from "@tanstack/react-router";
import { lazyPage } from "@/routes/-lazyRoute";

export const Route = createFileRoute("/_app/affiliate")({
  component: lazyPage(
    () => import("@/apps/reef-al-madina/features/affiliate/components/AffiliateDashboard"),
  ),
});
