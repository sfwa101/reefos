import { createFileRoute } from "@tanstack/react-router";
import SovereignTracing from "@/components/admin/views/SovereignTracing";
export const Route = createFileRoute("/admin/tracing")({ component: SovereignTracing });
