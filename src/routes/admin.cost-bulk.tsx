import { createFileRoute } from "@tanstack/react-router";
import { lazyPage } from "@/routes/-lazyRoute";
export const Route = createFileRoute("/admin/cost-bulk")({
  component: lazyPage(() => import("@/pages/admin/CostBulk")),
});
