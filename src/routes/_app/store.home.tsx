import { createFileRoute } from "@tanstack/react-router";
import { lazyStorePage } from "../-lazyRoute";
export const Route = createFileRoute("/_app/store/home")({
  component: lazyStorePage(() => import("@/pages/store/HomeGoods"), "grid"),
});
