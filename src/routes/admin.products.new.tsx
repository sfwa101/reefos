import { createFileRoute } from "@tanstack/react-router";
import { SmartProductComposer } from "@/apps/reef-al-madina/features/admin/product-editor/SmartProductComposer";

export const Route = createFileRoute("/admin/products/new")({
  component: SmartProductComposer,
});
