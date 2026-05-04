import { createFileRoute } from "@tanstack/react-router";
import ProfitObservationRoom from "@/pages/admin/ProfitObservationRoom";
export const Route = createFileRoute("/admin/profit-observation")({
  component: ProfitObservationRoom,
});
