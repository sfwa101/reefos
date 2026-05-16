import { createFileRoute } from "@tanstack/react-router";
import { KhalilInsightsPage } from "@/apps/khalil/pages/Insights";

export const Route = createFileRoute("/khalil/insights")({
  component: KhalilInsightsPage,
});
