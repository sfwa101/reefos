import { createFileRoute } from "@tanstack/react-router";
import SovereignControlPlane from "@/components/admin/views/SovereignControlPlane";
export const Route = createFileRoute("/admin/control-plane")({ component: SovereignControlPlane });
