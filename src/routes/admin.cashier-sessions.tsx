import { createFileRoute } from "@tanstack/react-router";
import CashierSessions from "@/pages/admin/CashierSessions";
export const Route = createFileRoute("/admin/cashier-sessions")({ component: CashierSessions });
