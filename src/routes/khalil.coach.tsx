import { createFileRoute } from "@tanstack/react-router";
import { KhalilCoachPage } from "@/apps/khalil/pages/Coach";

export const Route = createFileRoute("/khalil/coach")({
  component: KhalilCoachPage,
});
