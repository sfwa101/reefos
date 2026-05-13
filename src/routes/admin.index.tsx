import { createFileRoute } from "@tanstack/react-router";
import BusinessOpsDashboard from "@/components/admin/views/BusinessOpsDashboard";
export const Route = createFileRoute("/admin/")({ component: BusinessOpsDashboard });
