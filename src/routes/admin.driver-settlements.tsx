import { createFileRoute } from "@tanstack/react-router";
import DriverSettlements from "@/components/admin/views/DriverSettlements";
export const Route = createFileRoute("/admin/driver-settlements")({ component: DriverSettlements });
