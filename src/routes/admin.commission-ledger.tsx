import { createFileRoute } from "@tanstack/react-router";
import CommissionLedger from "@/components/admin/views/CommissionLedger";
export const Route = createFileRoute("/admin/commission-ledger")({ component: CommissionLedger });
