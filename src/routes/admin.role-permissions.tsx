import { createFileRoute } from "@tanstack/react-router";
import RolePermissions from "@/pages/admin/RolePermissions";
export const Route = createFileRoute("/admin/role-permissions")({ component: RolePermissions });
