import { createFileRoute } from "@tanstack/react-router";
import { lazyPage } from "@/routes/_lazyRoute";
export const Route = createFileRoute("/admin/marketing")({
  component: lazyPage(() => import("@/pages/admin/Marketing")),
});
