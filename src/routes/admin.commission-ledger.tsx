import { createFileRoute } from "@tanstack/react-router";
import CommissionLedger from "@/pages/admin/CommissionLedger";
export const Route = createFileRoute("/admin/commission-ledger")({ component: CommissionLedger });
