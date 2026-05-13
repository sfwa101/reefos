import { createFileRoute } from "@tanstack/react-router";
import { lazyPage } from "@/routes/-lazyRoute";
export const Route = createFileRoute("/admin/inventory")({
  component: lazyPage(() => import("@/components/admin/views/Inventory")),
});
