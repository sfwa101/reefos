import { createFileRoute } from "@tanstack/react-router";
import Finance from "@/components/admin/views/Finance";
export const Route = createFileRoute("/admin/finance")({ component: Finance });
