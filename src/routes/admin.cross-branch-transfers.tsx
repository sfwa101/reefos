import { createFileRoute } from "@tanstack/react-router";
import CrossBranchTransfers from "@/pages/admin/CrossBranchTransfers";
export const Route = createFileRoute("/admin/cross-branch-transfers")({ component: CrossBranchTransfers });
