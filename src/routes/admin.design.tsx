import { createFileRoute } from "@tanstack/react-router";
import DesignEditor from "@/components/admin/views/DesignEditor";
export const Route = createFileRoute("/admin/design")({
  component: DesignEditor,
});
