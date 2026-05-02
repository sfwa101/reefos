import { createFileRoute } from "@tanstack/react-router";
import SystemSettings from "@/pages/admin/SystemSettings";
export const Route = createFileRoute("/admin/system-settings")({ component: SystemSettings });
