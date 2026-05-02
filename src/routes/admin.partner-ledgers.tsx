import { createFileRoute } from "@tanstack/react-router";
import PartnerLedgers from "@/pages/admin/PartnerLedgers";
export const Route = createFileRoute("/admin/partner-ledgers")({ component: PartnerLedgers });
