import { createFileRoute } from "@tanstack/react-router";
import Suppliers from "@/components/admin/views/Suppliers";
export const Route = createFileRoute("/admin/suppliers")({ component: Suppliers });
