import { createFileRoute } from "@tanstack/react-router";
import AdvanceApprovals from "@/components/admin/views/AdvanceApprovals";
export const Route = createFileRoute("/admin/advance-approvals")({ component: AdvanceApprovals });
