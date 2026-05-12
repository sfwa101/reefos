import { createFileRoute } from "@tanstack/react-router";
import AdminHub from "@/pages/admin/AdminHub";

export const Route = createFileRoute("/admin/hub")({ component: AdminHub });
