import { createFileRoute } from "@tanstack/react-router";
import { lazyStorePage } from "../_lazyRoute";
export const Route = createFileRoute("/_app/store/baskets-build")({
  component: lazyStorePage(() => import("@/pages/store/BasketsBuild"), "list"),
});
