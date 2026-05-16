import { createFileRoute } from "@tanstack/react-router";
import { KhalilRecoveryPage } from "@/apps/khalil/pages/Recovery";

export const Route = createFileRoute("/khalil/recovery")({
  component: KhalilRecoveryPage,
});
