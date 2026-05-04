import { createFileRoute } from "@tanstack/react-router";
import { lazyStorePage } from "../-lazyRoute";
export const Route = createFileRoute("/_app/store/library")({
  component: lazyStorePage(() => import("@/pages/store/SchoolLibrary"), "grid"),
});
