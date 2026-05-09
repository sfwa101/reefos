import { createFileRoute } from "@tanstack/react-router";
import BusinessOpsDashboard from "@/pages/admin/BusinessOpsDashboard";
export const Route = createFileRoute("/admin/")({ component: BusinessOpsDashboard });
