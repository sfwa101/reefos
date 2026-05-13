import { createFileRoute } from "@tanstack/react-router";
import CFODashboard from "@/components/admin/views/CFODashboard";
export const Route = createFileRoute("/admin/cfo")({ component: CFODashboard });
