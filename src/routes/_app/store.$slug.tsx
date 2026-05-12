import { createFileRoute, notFound } from "@tanstack/react-router";
import { lazyStorePage } from "../-lazyRoute";
import { getSectionIdentity } from "@/core/catalog/registry/SectionIdentityRegistry";

export const Route = createFileRoute("/_app/store/$slug")({
  beforeLoad: ({ params }) => {
    if (!getSectionIdentity(params.slug)) throw notFound();
  },
  component: lazyStorePage(() => import("@/pages/store/SectionPage"), "grid"),
});
