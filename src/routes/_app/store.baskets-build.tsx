import { createFileRoute } from "@tanstack/react-router";
import { lazyStorePage } from "../-lazyRoute";
export const Route = createFileRoute("/_app/store/baskets-build")({
  component: lazyStorePage(() => import("@/pages/store/BasketsBuild"), "list"),
});
