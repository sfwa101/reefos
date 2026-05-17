import { createFileRoute } from "@tanstack/react-router";
import { KhalilJourneyPage } from "@/apps/khalil/pages/Journey";

export const Route = createFileRoute("/khalil/journey")({
  component: KhalilJourneyPage,
});
