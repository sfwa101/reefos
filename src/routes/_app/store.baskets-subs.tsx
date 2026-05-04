import { createFileRoute } from "@tanstack/react-router";
import { lazyStorePage } from "../-lazyRoute";
export const Route = createFileRoute("/_app/store/baskets-subs")({
  component: lazyStorePage(() => import("@/pages/store/BasketsSubs"), "list"),
});
