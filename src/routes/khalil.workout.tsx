import { createFileRoute } from "@tanstack/react-router";
import { KhalilPlaceholderPage } from "@/apps/khalil/pages/Placeholder";

export const Route = createFileRoute("/khalil/workout")({
  component: () => <KhalilPlaceholderPage titleKey="khalil.nav.workout" />,
});
