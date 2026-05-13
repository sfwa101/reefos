import { createFileRoute } from "@tanstack/react-router";
import StaffAdvances from "@/components/admin/views/StaffAdvances";
export const Route = createFileRoute("/admin/staff-advances")({ component: StaffAdvances });
