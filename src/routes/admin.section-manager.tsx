import { createFileRoute } from "@tanstack/react-router";
import SectionManager from "@/components/admin/views/SectionManager";
export const Route = createFileRoute("/admin/section-manager")({
  component: SectionManager,
});
