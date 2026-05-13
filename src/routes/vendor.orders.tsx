import { createFileRoute } from "@tanstack/react-router";
import VendorOrders from "@/components/vendor/views/VendorOrders";
export const Route = createFileRoute("/vendor/orders")({ component: VendorOrders });
