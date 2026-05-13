import { createFileRoute } from "@tanstack/react-router";
import CashierSessions from "@/components/admin/views/CashierSessions";
export const Route = createFileRoute("/admin/cashier-sessions")({ component: CashierSessions });
