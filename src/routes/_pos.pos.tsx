import { createFileRoute } from "@tanstack/react-router";
import POSPage from "@/components/pos/POSView";

export const Route = createFileRoute("/_pos/pos")({
  component: POSPage,
});
