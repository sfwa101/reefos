import { createFileRoute } from "@tanstack/react-router";
import StaffAttendance from "@/components/admin/views/StaffAttendance";
export const Route = createFileRoute("/admin/staff-attendance")({ component: StaffAttendance });
