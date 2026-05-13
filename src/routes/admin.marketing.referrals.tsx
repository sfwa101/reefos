import { createFileRoute } from "@tanstack/react-router";
import Referrals from "@/components/admin/views/Referrals";
export const Route = createFileRoute("/admin/marketing/referrals")({
  component: Referrals,
});
