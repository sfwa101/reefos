import { createFileRoute } from "@tanstack/react-router";
import { lazyPage } from "@/routes/-lazyRoute";

export const Route = createFileRoute("/_app/affiliate")({
  component: lazyPage(
    () => import("@/features/affiliate/components/AffiliateDashboard"),
  ),
});
