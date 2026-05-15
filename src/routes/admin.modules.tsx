import { createFileRoute } from "@tanstack/react-router";
import { lazyPage } from "@/routes/-lazyRoute";

export const Route = createFileRoute("/admin/modules")({
  component: lazyPage(() => import("@/components/admin/views/Modules")),
});
