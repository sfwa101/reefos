import { createFileRoute } from "@tanstack/react-router";
import StoreSettlements from "@/components/admin/views/StoreSettlements";
export const Route = createFileRoute("/admin/store-settlements")({ component: StoreSettlements });
