import { createFileRoute } from "@tanstack/react-router";
import BusinessRules from "@/pages/admin/BusinessRules";
export const Route = createFileRoute("/admin/business-rules")({
  component: BusinessRules,
});
