import { createFileRoute } from "@tanstack/react-router";
import { lazyStorePage } from "../-lazyRoute";
export const Route = createFileRoute("/_app/store/dairy")({
  component: lazyStorePage(() => import("@/pages/store/Dairy"), "grid"),
});
