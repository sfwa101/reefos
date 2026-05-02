import { createFileRoute } from "@tanstack/react-router";
import { lazyPage } from "@/routes/_lazyRoute";
export const Route = createFileRoute("/_app/account/verification")({
  component: lazyPage(() => import("@/pages/account/Verification")),
});
