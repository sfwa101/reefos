import { createFileRoute } from "@tanstack/react-router";
import SovereignPOS from "@/apps/reef-al-madina/features/pos/SovereignPOS";

export const Route = createFileRoute("/admin/pos")({
  component: SovereignPOS,
});
