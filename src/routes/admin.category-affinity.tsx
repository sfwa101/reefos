import { createFileRoute } from "@tanstack/react-router";
import CategoryAffinity from "@/components/admin/views/CategoryAffinity";
export const Route = createFileRoute("/admin/category-affinity")({ component: CategoryAffinity });
