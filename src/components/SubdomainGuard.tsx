/**
 * Phase 10.1 — Subdomain Guard
 * ----------------------------------------------------------------
 * Splits the app into two physically-isolated UX surfaces by hostname:
 *
 *   • `admin.*`  → ONLY `/admin/**` routes are reachable. Any visit to
 *                  a customer-facing path is redirected to `/admin`.
 *   • everything else → `/admin/**` is hidden; visiting it bounces
 *                       back to `/`.
 *
 * SSR-safe: the check runs inside `useEffect`, so server renders are
 * neutral. On localhost / preview hosts (no `admin.` prefix), behaves
 * exactly like a regular customer build.
 */

import { useEffect } from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";

function isAdminHost(): boolean {
  if (typeof window === "undefined") return false;
  return window.location.hostname.toLowerCase().startsWith("admin.");
}

export const SubdomainGuard = (): null => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const path = location.pathname;
    const adminHost = isAdminHost();
    const onAdminPath = path === "/admin" || path.startsWith("/admin/");

    if (adminHost && !onAdminPath) {
      void navigate({ to: "/admin", replace: true });
      return;
    }
    if (!adminHost && onAdminPath) {
      // Customer host should never expose admin surface.
      void navigate({ to: "/", replace: true });
    }
  }, [location.pathname, navigate]);

  return null;
};
