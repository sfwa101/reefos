import { createFileRoute } from "@tanstack/react-router";
import { lazyStorePage } from "../-lazyRoute";
export const Route = createFileRoute("/_app/store/produce")({
  component: lazyStorePage(() => import("@/pages/store/Produce"), "grid"),
});
