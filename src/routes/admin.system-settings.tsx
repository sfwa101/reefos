import { createFileRoute } from "@tanstack/react-router";
import SystemSettings from "@/components/admin/views/SystemSettings";
export const Route = createFileRoute("/admin/system-settings")({ component: SystemSettings });
