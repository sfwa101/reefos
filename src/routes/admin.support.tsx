import { createFileRoute } from "@tanstack/react-router";
import Support from "@/components/admin/views/Support";
export const Route = createFileRoute("/admin/support")({
  component: Support,
});
