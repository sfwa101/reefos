import { createFileRoute } from "@tanstack/react-router";
import CrossBranchTransfers from "@/components/admin/views/CrossBranchTransfers";
export const Route = createFileRoute("/admin/cross-branch-transfers")({ component: CrossBranchTransfers });
