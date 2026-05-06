import { createFileRoute } from "@tanstack/react-router";
import { lazyPage } from "@/routes/-lazyRoute";
export const Route = createFileRoute("/admin/products")({
  component: lazyPage(() => import("@/pages/admin/Products")),
});
