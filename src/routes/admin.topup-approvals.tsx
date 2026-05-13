import { createFileRoute } from "@tanstack/react-router";
import TopupApprovals from "@/components/admin/views/TopupApprovals";
export const Route = createFileRoute("/admin/topup-approvals")({ component: TopupApprovals });
