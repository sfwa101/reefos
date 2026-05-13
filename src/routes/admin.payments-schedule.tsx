import { createFileRoute } from "@tanstack/react-router";
import PaymentsSchedule from "@/components/admin/views/PaymentsSchedule";
export const Route = createFileRoute("/admin/payments-schedule")({ component: PaymentsSchedule });
