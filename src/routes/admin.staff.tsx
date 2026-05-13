import { createFileRoute } from "@tanstack/react-router";
import Staff from "@/components/admin/views/Staff";
export const Route = createFileRoute("/admin/staff")({ component: Staff });
