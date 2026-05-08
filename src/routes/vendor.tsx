import { createFileRoute } from "@tanstack/react-router";
import VendorShell from "@/pages/vendor/VendorShell";
import { RoleGuard } from "@/components/admin/RoleGuard";

export const Route = createFileRoute("/vendor")({
  component: () => (
    <RoleGuard roles={["vendor", "admin"]}>
      <VendorShell />
    </RoleGuard>
  ),
});
