/**
 * /vendor/dashboard — P0 / V-12 fix.
 *
 * Previously a silent redirect to `/vendor`, which made the dashboard
 * URL unusable for direct sharing / deep links and broke vendor KPIs
 * for unit testing. Now mounts the real `VendorDashboard` inside the
 * RoleGuard so cards render at the canonical URL.
 */
import { createFileRoute } from "@tanstack/react-router";
import VendorDashboard from "@/components/vendor/views/VendorDashboard";
import { RoleGuard } from "@/components/admin/RoleGuard";

export const Route = createFileRoute("/vendor/dashboard")({
  component: () => (
    <RoleGuard roles={["vendor", "admin"]}>
      <VendorDashboard />
    </RoleGuard>
  ),
});
