import { createFileRoute } from "@tanstack/react-router";
import Settings from "@/components/admin/views/Settings";
export const Route = createFileRoute("/admin/settings")({ component: Settings });
