import { createFileRoute } from "@tanstack/react-router";
import { lazyStorePage } from "../-lazyRoute";
export const Route = createFileRoute("/_app/store/supermarket")({
  component: lazyStorePage(() => import("@/pages/store/Supermarket"), "grid"),
});
