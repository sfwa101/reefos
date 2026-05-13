import { createFileRoute } from "@tanstack/react-router";
import AdminHub from "@/components/admin/views/AdminHub";

export const Route = createFileRoute("/admin/hub")({ component: AdminHub });
