import { createFileRoute } from "@tanstack/react-router";
import AffiliateSettings from "@/components/admin/views/AffiliateSettings";
export const Route = createFileRoute("/admin/affiliate-settings")({ component: AffiliateSettings });
