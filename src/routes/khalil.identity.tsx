import { createFileRoute } from "@tanstack/react-router";
import { KhalilIdentityPage } from "@/apps/khalil/pages/Identity";

export const Route = createFileRoute("/khalil/identity")({
  component: KhalilIdentityPage,
});
