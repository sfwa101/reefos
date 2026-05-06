import { createFileRoute } from "@tanstack/react-router";
import { lazyPage } from "@/routes/-lazyRoute";
export const Route = createFileRoute("/admin/customers")({
  component: lazyPage(() => import("@/pages/admin/Customers")),
});
