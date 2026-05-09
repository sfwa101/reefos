/**
 * MaintenanceGate — Phase 38 Sovereign Control Plane.
 *
 * Reads the `system_maintenance` kill switch from `app_settings`. When ON:
 *   - Admin users still see the full app (so they can disable the switch).
 *   - All other routes outside `/admin` and `/auth` are replaced by a
 *     full-screen maintenance notice.
 */
import { useLocation } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";
import { useSystemSetting } from "@/hooks/useSystemSettings";
import { useAdminRoles } from "@/components/admin/RoleGuard";

export function MaintenanceGate({ children }: { children: React.ReactNode }) {
  const { value: maintenance, loading } = useSystemSetting<boolean>(
    "system_maintenance",
    false,
  );
  const { hasRole } = useAdminRoles();
  const { pathname } = useLocation();

  // Always allow admin shell + auth, regardless of switch state.
  const isExempt =
    pathname.startsWith("/admin") || pathname.startsWith("/auth") || hasRole("admin");

  if (loading || !maintenance || isExempt) return <>{children}</>;

  return (
    <div
      dir="rtl"
      className="min-h-screen w-full grid place-items-center bg-gradient-to-br from-amber-50 via-background to-amber-100 dark:from-amber-500/10 dark:via-background dark:to-amber-500/5 p-6"
    >
      <div className="max-w-md w-full text-center bg-surface rounded-3xl border border-amber-500/30 shadow-soft p-8">
        <div className="mx-auto h-16 w-16 rounded-2xl bg-amber-500/15 text-amber-600 grid place-items-center mb-4">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <h1 className="font-display text-[24px] tracking-tight">صيانة مجدولة</h1>
        <p className="mt-2 text-[13px] text-foreground-secondary leading-relaxed">
          نقوم حالياً بترقية المنظومة لخدمتك بشكل أفضل. سنعود خلال دقائق — شكراً لصبرك.
        </p>
      </div>
    </div>
  );
}
