import { createFileRoute } from "@tanstack/react-router";
import RolePermissions from "@/components/admin/views/RolePermissions";
export const Route = createFileRoute("/admin/role-permissions")({ component: RolePermissions });
