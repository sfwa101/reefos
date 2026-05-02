import { createFileRoute } from "@tanstack/react-router";
import { lazyPage } from "@/routes/_lazyRoute";
export const Route = createFileRoute("/_app/account/help")({
  component: lazyPage(() => import("@/pages/account/Help")),
});
