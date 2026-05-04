import { createFileRoute } from "@tanstack/react-router";
import { RoleGuard } from "@/components/admin/RoleGuard";
import CatalogBackup from "@/pages/admin/CatalogBackup";

export const Route = createFileRoute("/admin/catalog-backup")({
  component: () => (
    <RoleGuard roles={["admin"]}>
      <CatalogBackup />
    </RoleGuard>
  ),
});
