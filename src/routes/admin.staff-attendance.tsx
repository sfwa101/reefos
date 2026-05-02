import { createFileRoute } from "@tanstack/react-router";
import StaffAttendance from "@/pages/admin/StaffAttendance";
export const Route = createFileRoute("/admin/staff-attendance")({ component: StaffAttendance });
