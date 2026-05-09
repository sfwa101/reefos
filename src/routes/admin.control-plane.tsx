import { createFileRoute } from "@tanstack/react-router";
import SovereignControlPlane from "@/pages/admin/SovereignControlPlane";
export const Route = createFileRoute("/admin/control-plane")({ component: SovereignControlPlane });
