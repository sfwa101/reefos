import { createFileRoute } from "@tanstack/react-router";
import { KhalilHomePage } from "@/apps/khalil/pages/Home";

export const Route = createFileRoute("/khalil/")({
  component: KhalilHomePage,
});
