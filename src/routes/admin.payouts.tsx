import { createFileRoute } from "@tanstack/react-router";
import AdminPayouts from "@/components/admin/views/Payouts";
export const Route = createFileRoute("/admin/payouts")({
  component: AdminPayouts,
});
