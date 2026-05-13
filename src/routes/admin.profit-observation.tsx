import { createFileRoute } from "@tanstack/react-router";
import ProfitObservationRoom from "@/components/admin/views/ProfitObservationRoom";
export const Route = createFileRoute("/admin/profit-observation")({
  component: ProfitObservationRoom,
});
