import { createFileRoute } from "@tanstack/react-router";
import { lazyStorePage } from "../_lazyRoute";
export const Route = createFileRoute("/_app/store/kitchen")({
  component: lazyStorePage(() => import("@/pages/store/Kitchen"), "grid"),
});
