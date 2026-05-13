import { createFileRoute } from "@tanstack/react-router";
import BusinessRules from "@/components/admin/views/BusinessRules";
export const Route = createFileRoute("/admin/business-rules")({
  component: BusinessRules,
});
