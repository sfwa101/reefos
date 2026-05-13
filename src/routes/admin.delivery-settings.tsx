import { createFileRoute } from "@tanstack/react-router";
import DeliverySettings from "@/components/admin/views/DeliverySettings";
export const Route = createFileRoute("/admin/delivery-settings")({ component: DeliverySettings });
