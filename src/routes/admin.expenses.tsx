import { createFileRoute } from "@tanstack/react-router";
import Expenses from "@/components/admin/views/Expenses";
export const Route = createFileRoute("/admin/expenses")({ component: Expenses });
