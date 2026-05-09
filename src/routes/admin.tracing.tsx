import { createFileRoute } from "@tanstack/react-router";
import SovereignTracing from "@/pages/admin/SovereignTracing";
export const Route = createFileRoute("/admin/tracing")({ component: SovereignTracing });
