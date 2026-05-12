import { createFileRoute } from "@tanstack/react-router";
import SectionManager from "@/pages/admin/SectionManager";
export const Route = createFileRoute("/admin/section-manager")({
  component: SectionManager,
});
