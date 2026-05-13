import { createFileRoute } from "@tanstack/react-router";
import OrderDetail from "@/components/admin/views/OrderDetail";
export const Route = createFileRoute("/admin/orders/$orderId")({ component: OrderDetail });
