import { createFileRoute } from "@tanstack/react-router";
import PartnerLedgers from "@/components/admin/views/PartnerLedgers";
export const Route = createFileRoute("/admin/partner-ledgers")({ component: PartnerLedgers });
