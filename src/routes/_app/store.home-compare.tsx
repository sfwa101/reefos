import { createFileRoute } from "@tanstack/react-router";
import { lazyStorePage } from "../-lazyRoute";
export const Route = createFileRoute("/_app/store/home-compare")({
  component: lazyStorePage(() => import("@/pages/store/CompareHomeGoods"), "list"),
});
