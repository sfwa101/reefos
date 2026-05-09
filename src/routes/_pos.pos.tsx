import { createFileRoute } from "@tanstack/react-router";
import POSPage from "@/pages/POS";

export const Route = createFileRoute("/_pos/pos")({
  component: POSPage,
});
