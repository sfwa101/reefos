import { createFileRoute } from "@tanstack/react-router";
import SovereignTreasury from "@/components/admin/views/SovereignTreasury";
export const Route = createFileRoute("/admin/sovereign-treasury")({ component: SovereignTreasury });
