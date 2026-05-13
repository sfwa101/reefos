import { createFileRoute } from "@tanstack/react-router";
import SavingsAdmin from "@/components/admin/views/Savings";
export const Route = createFileRoute("/admin/savings")({
  component: SavingsAdmin,
});
