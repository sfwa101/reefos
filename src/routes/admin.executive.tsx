import { createFileRoute } from "@tanstack/react-router";
import ExecutiveDashboard from "@/components/admin/views/ExecutiveDashboard";
export const Route = createFileRoute("/admin/executive")({ component: ExecutiveDashboard });
