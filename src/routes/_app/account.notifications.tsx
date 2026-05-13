import { createFileRoute } from "@tanstack/react-router";
import { lazyPage } from "@/routes/-lazyRoute";
export const Route = createFileRoute("/_app/account/notifications")({
  component: lazyPage(() => import("@/components/account/views/Notifications")),
});
