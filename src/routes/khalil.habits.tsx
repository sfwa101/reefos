import { createFileRoute } from "@tanstack/react-router";
import { KhalilPlaceholderPage } from "@/apps/khalil/pages/Placeholder";

export const Route = createFileRoute("/khalil/habits")({
  component: () => <KhalilPlaceholderPage titleKey="khalil.nav.habits" />,
});
