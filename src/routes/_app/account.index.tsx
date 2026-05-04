import { createFileRoute } from "@tanstack/react-router";
import { lazyPage } from "@/routes/-lazyRoute";
export const Route = createFileRoute("/_app/account/")({
  component: lazyPage(() => import("@/pages/Account")),
});
