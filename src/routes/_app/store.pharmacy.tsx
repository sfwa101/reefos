import { createFileRoute } from "@tanstack/react-router";
import { lazyStorePage } from "../-lazyRoute";
export const Route = createFileRoute("/_app/store/pharmacy")({
  component: lazyStorePage(() => import("@/pages/store/Pharmacy"), "grid"),
});
