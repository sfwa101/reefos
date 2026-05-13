import { createFileRoute } from "@tanstack/react-router";
import { lazyPage } from "@/routes/-lazyRoute";
export const Route = createFileRoute("/admin/orders/")({
  component: lazyPage(() => import("@/components/admin/views/Orders")),
});
