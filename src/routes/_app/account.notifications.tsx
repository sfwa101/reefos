import { createFileRoute } from "@tanstack/react-router";
import { lazyPage } from "@/routes/_lazyRoute";
export const Route = createFileRoute("/_app/account/notifications")({
  component: lazyPage(() => import("@/pages/account/Notifications")),
});
