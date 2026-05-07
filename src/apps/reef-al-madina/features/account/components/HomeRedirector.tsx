import { useEffect, useRef, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useUserRoles } from "@/hooks/useUserRoles";
import { pickDefaultView, readActiveView, VIEW_PATHS } from "@/lib/defaultView";

/**
 * On first visit to `/`, if the user has a non-customer role and no
 * persisted active view, send them to their default workspace.
 * Customers and users who already chose "customer" stay here.
 *
 * Uses a one-shot ref guard to prevent navigation loops if a downstream
 * route redirects back to `/` (e.g. admin host guard, role guard fallback).
 */
const HomeRedirector = ({ children }: { children: ReactNode }) => {
  const { roles, loading } = useUserRoles();
  const navigate = useNavigate();
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    if (loading) return;
    if (roles.length === 0) {
      fired.current = true;
      return;
    }
    // Phase VIII — Absolute Authority Override:
    // Suppress auto-redirect for admins / managers so they can freely browse
    // client-side surfaces (Reef, Khalil, etc.) for QA and testing.
    // Also honor the dev "Absolute Manager Mode" flag and "Khalil-as-Default".
    const godMode =
      typeof window !== "undefined" &&
      window.localStorage.getItem("salsabil.dev.godMode") === "1";
    const khalilDefault =
      typeof window !== "undefined" &&
      window.localStorage.getItem("salsabil.dev.khalilAsDefault") === "1";
    const isAdminish = roles.some((r) =>
      ["admin", "branch_manager", "store_manager", "finance"].includes(r),
    );
    fired.current = true;
    if (godMode || khalilDefault || isAdminish) return;
    const saved = readActiveView();
    const view = pickDefaultView(roles, saved);
    if (view !== "customer" && VIEW_PATHS[view] !== "/") {
      navigate({ to: VIEW_PATHS[view], replace: true });
    }
  }, [loading, roles, navigate]);

  return <>{children}</>;
};

export default HomeRedirector;
