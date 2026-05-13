import { createFileRoute } from "@tanstack/react-router";
import RibaAudit from "@/components/admin/views/RibaAudit";
export const Route = createFileRoute("/admin/riba-audit")({ component: RibaAudit });
