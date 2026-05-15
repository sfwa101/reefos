import { createFileRoute } from "@tanstack/react-router";
import OSHome from "@/components/admin/views/OSHome";

export const Route = createFileRoute("/admin/os")({
  component: OSHome,
});
