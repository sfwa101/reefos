import { useEffect, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useUserRoles } from "@/hooks/useUserRoles";
import { pickDefaultView, readActiveView, VIEW_PATHS } from "@/lib/defaultView";

/**
 * On first visit to `/`, if the user has a non-customer role and no
 * persisted active view, send them to their default workspace.
 * Customers and users who already chose "customer" stay here.
 */
const HomeRedirector = ({ children }: { children: ReactNode }) => {
  const { roles, loading } = useUserRoles();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (roles.length === 0) return;
    const saved = readActiveView();
    const view = pickDefaultView(roles, saved);
    if (view !== "customer" && VIEW_PATHS[view] !== "/") {
      navigate({ to: VIEW_PATHS[view], replace: true });
    }
  }, [loading, roles, navigate]);

  return <>{children}</>;
};

export default HomeRedirector;
