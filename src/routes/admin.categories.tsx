import { createFileRoute } from "@tanstack/react-router";
import Categories from "@/components/admin/views/Categories";

export const Route = createFileRoute("/admin/categories")({ component: Categories });
