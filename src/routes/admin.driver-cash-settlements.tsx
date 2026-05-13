import { createFileRoute } from "@tanstack/react-router";
import DriverCashSettlements from "@/components/admin/views/DriverCashSettlements";
export const Route = createFileRoute("/admin/driver-cash-settlements")({ component: DriverCashSettlements });
