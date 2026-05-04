import { createFileRoute } from "@tanstack/react-router";
import { lazyPage } from "@/routes/-lazyRoute";
export const Route = createFileRoute("/_app/account/orders")({
  component: lazyPage(() => import("@/pages/account/Orders")),
});
