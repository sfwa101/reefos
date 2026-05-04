import { createFileRoute } from "@tanstack/react-router";
import { lazyStorePage } from "../-lazyRoute";
export const Route = createFileRoute("/_app/store/sweets")({
  component: lazyStorePage(() => import("@/pages/store/Sweets"), "grid"),
});
