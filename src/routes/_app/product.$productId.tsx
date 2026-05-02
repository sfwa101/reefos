import { createFileRoute } from "@tanstack/react-router";
import { lazyPage } from "@/routes/_lazyRoute";
export const Route = createFileRoute("/_app/product/$productId")({
  component: lazyPage(() => import("@/pages/ProductDetail")),
});
