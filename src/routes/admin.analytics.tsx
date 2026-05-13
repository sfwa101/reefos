import { createFileRoute } from "@tanstack/react-router";
import AnalyticsAdmin from "@/components/admin/views/Analytics";
export const Route = createFileRoute("/admin/analytics")({
  component: AnalyticsAdmin,
});
