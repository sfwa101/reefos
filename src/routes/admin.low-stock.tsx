import { createFileRoute } from "@tanstack/react-router";
import LowStock from "@/components/admin/views/LowStock";
export const Route = createFileRoute("/admin/low-stock")({ component: LowStock });
