import { createFileRoute } from "@tanstack/react-router";
import { KhalilMissionsPage } from "@/apps/khalil/pages/Missions";

export const Route = createFileRoute("/khalil/missions")({
  component: KhalilMissionsPage,
});
