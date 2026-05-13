import { createFileRoute } from "@tanstack/react-router";
import Delivery from "@/components/admin/views/Delivery";
export const Route = createFileRoute("/admin/delivery")({ component: Delivery });
