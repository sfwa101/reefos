import { createFileRoute } from "@tanstack/react-router";
import { lazyPage } from "@/routes/-lazyRoute";
export const Route = createFileRoute("/_app/account/settings")({
  component: lazyPage(() => import("@/pages/account/Settings")),
});
